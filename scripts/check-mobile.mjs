// Development-only browser checks for the mobile wheel and location sheet.
import {chromium} from 'playwright';
import {readFile,mkdtemp,access} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const html=await readFile(new URL('solar-year.html',root),'utf8');
let executablePath=process.env.SOLAR_BROWSER_PATH;
if(!executablePath){try{await access('/usr/bin/chromium');executablePath='/usr/bin/chromium';}catch{}}
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox']});
const output=await mkdtemp(path.join(tmpdir(),'solar-mobile-check-'));
async function open(width,height,latitude=40,touch=true){
 const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,timezoneId:'Europe/London'});
 await context.route('**/*',r=>r.request().url()==='http://localhost:5173/'?r.fulfill({body:html,contentType:'text/html'}):r.abort());
 await context.addInitScript(({latitude})=>{localStorage.setItem('solar-year.location.v1',JSON.stringify({latitude,longitude:0,label:'A long place name for mobile layout checking',source:'latitude'}));navigator.geolocation.getCurrentPosition=(_s,e)=>e({code:1});},{latitude});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date('2026-10-29T12:00:00Z')});await page.goto('http://localhost:5173/');await page.locator('.day').first().waitFor();
 return {context,page,errors};
}
try{
 for(const [width,height,latitude] of [[320,568,90],[360,740,40],[390,844,40],[430,932,-90],[844,390,40]]){
  const {context,page,errors}=await open(width,height,latitude);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal overflow');
  assert.equal(await page.locator('.mobile-readout').isVisible(),true);
  assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).overscrollBehaviorY),'none');
  assert.equal(await page.locator('.touch-wheel').evaluate(el=>getComputedStyle(el).touchAction),'pinch-zoom');
  for(const button of await page.locator('.mobile-place-trigger, .view-toggle').all())assert.ok((await button.boundingBox()).height>=44);
  const labels=await page.locator('.seasons text, .months text').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {text:el.textContent,left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));
  await page.screenshot({path:path.join(output,`initial-${width}-${height}.png`),fullPage:true});
  assert.ok(labels.every(r=>r.left>=-.5&&r.right<=width+.5&&r.top>=0),`Wheel labels fit ${width}: ${JSON.stringify(labels.filter(r=>r.left<0||r.right>width||r.top<0))}`);
  const cdp=await context.newCDPSession(page);
  async function coordinate(index){return page.locator('.day').nth(index).evaluate(el=>{const svg=el.ownerSVGElement,a=Number(el.dataset.mid)*Math.PI/180;const p=new DOMPoint(500+310*Math.sin(a),500-310*Math.cos(a)).matrixTransform(svg.getScreenCTM());return {x:p.x,y:p.y};});}
  const from=await coordinate(120),to=await coordinate(240);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...from,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...to,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await page.locator('.day').nth(240).getAttribute('aria-pressed'),'true','Drag crosses day segments and commits');
  assert.equal(await page.locator('.mobile-readout h1').textContent(),'August 29');
  assert.equal(await page.locator('.day-navigation, .mobile-hint, .mobile-center').count(),0);
  assert.equal((await page.locator('.seasons').textContent()).includes('EQUINOX'),false);
  await page.locator('.day').nth(240).focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('.mobile-readout h1').textContent(),'August 30');
  await page.keyboard.press('Escape');assert.equal(await page.locator('.mobile-readout h1').textContent(),'October 29');
  assert.ok((await page.locator('.mobile-readout').boundingBox()).y+(await page.locator('.mobile-readout').boundingBox()).height<=(await page.locator('.location-section').boundingBox()).y,'Readout is above location');
  const toggle=page.getByRole('switch',{name:'Show 12-hour line'});await toggle.click();assert.equal(await toggle.getAttribute('aria-checked'),'true');
  await page.locator('.mobile-place-trigger').click();await page.locator('#place-search').fill('London');await page.locator('.place-result').first().waitFor();
  const dialog=page.getByRole('dialog',{name:'Choose a place'});assert.equal(await dialog.isVisible(),true);
  const last=dialog.locator('a').last();await last.focus();await page.keyboard.press('Tab');assert.equal(await dialog.getByRole('button',{name:'Close place search'}).evaluate(el=>el===document.activeElement),true,'Focus stays in sheet');
  await page.evaluate(()=>{const vv=window.visualViewport;Object.defineProperties(vv,{height:{configurable:true,value:280},offsetTop:{configurable:true,value:0}});vv.dispatchEvent(new Event('resize'));});
  await page.waitForFunction(()=>document.querySelector('.place-panel').getBoundingClientRect().height<=265);
  const box=await dialog.boundingBox();assert.ok(box.y>=0&&box.y+box.height<=281,'Sheet fits the visible area above keyboard');
  await page.keyboard.press('Escape');assert.equal(await dialog.count(),0);assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('mobile-place-trigger')),true);assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
  await page.locator('.mobile-place-trigger').click();await page.locator('#place-search').fill('0');await page.getByRole('button',{name:/Use this latitude/}).click();assert.equal(await page.locator('.place-panel').count(),0);assert.ok((await page.locator('.mobile-place-meta').textContent()).startsWith('0°'));
  await page.screenshot({path:path.join(output,`checked-${width}-${height}.png`),fullPage:true});
  assert.deepEqual(errors,[]);console.log(`Passed ${width}×${height}: touch drag, keyboard navigation, bottom readout, reference line, focus trap, keyboard sizing, place selection, and overflow.`);await context.close();
 }
 const {context,page,errors}=await open(1440,1000,40,false);assert.equal(await page.locator('.mobile-readout').isVisible(),false);assert.equal(await page.locator('.touch-wheel').count(),0);assert.equal(await page.locator('svg').first().getAttribute('viewBox'),'0 0 1000 1000');await page.getByRole('button',{name:'Change place',exact:true}).click();assert.equal(await page.locator('.place-panel').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('.place-panel').count(),0);assert.deepEqual(errors,[]);await context.close();console.log('Passed desktop layout and original place popup.');
}finally{await browser.close();}
