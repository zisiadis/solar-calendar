import {chromium} from 'playwright';
import {access,mkdir,mkdtemp,readFile,writeFile,readdir,rename,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {packageVisualHistory} from './package-visual-history.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const args=process.argv.slice(2);
function option(name){const index=args.indexOf(`--${name}`);return index>=0?args[index+1]:args.find(arg=>arg.startsWith(`--${name}=`))?.slice(name.length+3);}
const settings=JSON.parse(await readFile(path.join(root,'scripts','visual-history-settings.json'),'utf8'));
const calendarDate=option('date')??args.find(arg=>/^\d{4}-\d{2}-\d{2}$/.test(arg))??settings.calendarDate;
if(!/^\d{4}-\d{2}-\d{2}$/.test(calendarDate))throw Error('Use YYYY-MM-DD for the calendar date.');
const title=option('title')??'Visual update';
const summary=option('summary')??'Automatically recorded after a changed visual export.';
const changeDate=new Intl.DateTimeFormat('en-CA',{timeZone:settings.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const visualHash=createHash('sha256');
async function hashVisualInputs(folder){
 for(const entry of (await readdir(folder,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
  const file=path.join(folder,entry.name);
  if(entry.isDirectory())await hashVisualInputs(file);
  else if(!/\.test\.[^.]+$/.test(entry.name)){visualHash.update(path.relative(root,file));visualHash.update(await readFile(file));}
 }
}
await hashVisualInputs(path.join(root,'src'));
for(const file of ['index.html','package-lock.json','scripts/visual-history-settings.json']){visualHash.update(file);visualHash.update(await readFile(path.join(root,file)));}
const visualSourceHash=visualHash.digest('hex');
const iterations=path.join(root,'docs','iterations');await mkdir(iterations,{recursive:true});
const previous=[];
for(const entry of await readdir(iterations,{withFileTypes:true})){
 if(!entry.isDirectory()||entry.name.startsWith('.'))continue;
 try{previous.push(JSON.parse(await readFile(path.join(iterations,entry.name,'manifest.json'),'utf8')));}catch(error){if(error.code!=='ENOENT')throw error;}
}
previous.sort((a,b)=>a.capturedAt.localeCompare(b.capturedAt));
if(args.includes('--if-changed')&&previous.at(-1)?.visualSourceHash===visualSourceHash){console.log('Visual inputs unchanged; previous screenshots preserved, no duplicate capture.');await packageVisualHistory();process.exit(0);}
const html=await readFile(path.join(root,'solar-year.html'),'utf8');
let executablePath=process.env.SOLAR_BROWSER_PATH;
if(!executablePath){try{await access('/usr/bin/chromium');executablePath='/usr/bin/chromium';}catch{}}
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox']});
let folder;
const slug=title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'visual-update';
for(let index=1;;index++){
 const prefix=`${changeDate}-${String(index).padStart(2,'0')}-`;
 if(!(await readdir(iterations)).some(name=>name.startsWith(prefix))){folder=path.join(iterations,prefix+slug);break;}
}
const staging=await mkdtemp(path.join(iterations,'.capture-'));
let completed=false;
const views=[
 {key:'01-day-lengths',title:'Day lengths',description:'The default and only visualization: radial lengths proportional to daylight; reference line off.',lengths:true,reference:false},
 {key:'02-day-lengths-reference',title:'Day lengths + 12-hour line',description:'Proportional day lengths with the optional reference circle and northeast 12 h label.',lengths:true,reference:true},
 {key:'03-selected-day',title:'Selected day',description:'An explicitly selected date with the mobile readout below the wheel, or desktop details.',lengths:true,reference:false,selected:true},
 {key:'04-place-search',title:'Place search',description:'Location search open: mobile bottom sheet or desktop popup.',lengths:true,reference:false,search:true},
];
const captures=[];
try{
 for(const device of settings.devices){
  const context=await browser.newContext({viewport:{width:device.width,height:device.height},hasTouch:device.touch??false,isMobile:device.touch??false,locale:'en-GB',timezoneId:settings.timezone,deviceScaleFactor:1});
  await context.route('**/*',route=>route.request().url()==='http://localhost:5173/'?route.fulfill({body:html,contentType:'text/html'}):route.abort());
  await context.addInitScript(({latitude,longitude})=>{localStorage.setItem('solar-year.location.v1',JSON.stringify({latitude,longitude,label:'Default location',source:'latitude'}));navigator.geolocation.getCurrentPosition=(_success,error)=>error({code:1});},{latitude:settings.latitude,longitude:settings.longitude});
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.clock.install({time:new Date(`${calendarDate}T12:00:00Z`)});
  await page.goto('http://localhost:5173/');await page.waitForSelector('.day');await page.evaluate(()=>document.fonts.ready);
  const latitudeText=`${Math.abs(settings.latitude).toFixed(1).replace(/\.0$/,'')}°${settings.latitude===0?'':settings.latitude<0?' S':' N'}`;
  assert.equal(await page.locator('.location-latitude').textContent(),latitudeText);
  for(const view of views){
   if(await page.locator('.place-panel').count())await page.keyboard.press('Escape');
   const mobile=await page.locator('.mobile-readout').isVisible();
   {const focused=page.locator('.day[tabindex="0"]');await focused.focus();await focused.press('Escape');}
   if(view.selected){const day=page.locator('.day').nth(120);await day.focus();await day.press('Enter');await day.evaluate(el=>el.blur());}
   if(view.search){await page.locator(mobile?'.mobile-place-trigger':'.place-control > .text-button').click();await page.locator('#place-search').fill('London');await page.locator('.place-result').first().waitFor();}
   assert.equal(await page.getByRole('switch',{name:'Show day lengths'}).count(),0);
   const referenceSwitch=page.getByRole('switch',{name:'Show 12-hour line'});
   if((await referenceSwitch.getAttribute('aria-checked')==='true')!==view.reference)await referenceSwitch.click();
   if(mobile)await page.waitForTimeout(250); // Let the label clearance and SVG resize settle.
   assert.ok(await page.locator('.day').evaluateAll(elements=>elements.every(el=>Math.abs(Number(el.dataset.outerRadius)-281-6*Number(el.dataset.hours))<1e-8)));
   assert.equal(await page.locator('.daylight-reference').count(),view.reference?1:0);
   assert.equal(await page.locator('.day title, .day[title], .solar-calendar > title, .today-marker title').count(),0,'Day hover tooltips must stay removed');
   assert.ok(await page.locator('.day').first().getAttribute('aria-label'),'Day details remain accessible');
   if(mobile){assert.ok(await page.locator('.touch-wheel').count());assert.equal(await page.locator('.mobile-readout').isVisible(),true);assert.equal(await page.locator('.day-navigation, .mobile-hint, .mobile-center').count(),0);assert.equal(await page.locator('.seasons').textContent().then(text=>text.includes('EQUINOX')),false);assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).overscrollBehaviorY),'none');}
   assert.equal(await page.locator('.place-panel').count(),view.search?1:0);
   if(view.selected)assert.equal(await page.locator('.day[aria-pressed="true"]').count(),1);
   const year=Number(calendarDate.slice(0,4));
   assert.equal(await page.locator('.day').count(),(Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/86400000);
   await page.mouse.move(0,0);if(!view.search)await page.evaluate(()=>document.activeElement?.blur());
   const file=`${view.key}-${device.name}.png`;
   const png=await page.screenshot({path:path.join(staging,file),fullPage:true,animations:'disabled',caret:'hide'});
   captures.push({file,view:view.title,device:device.name,width:png.readUInt32BE(16),height:png.readUInt32BE(20),viewport:{width:device.width,height:device.height},dayLengths:view.lengths,referenceLine:view.reference});
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 const manifest={title,summary,visualSourceHash,capturedAt:new Date().toISOString(),calendarDate,timezone:settings.timezone,location:{latitude:settings.latitude,longitude:settings.longitude,label:'Default location'},source:'solar-year.html',sourceSha256:createHash('sha256').update(html).digest('hex'),browser:browser.version(),captures};
 await writeFile(path.join(staging,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 const readme=`# ${title}\n\n${summary}\n\nCaptured for ${calendarDate}, at reference latitude **${settings.latitude}°** (longitude ${settings.longitude}°). The calendar date is fixed so these views can be compared without changes in date, hover, selection or location. Each PNG shows the **whole page**.\n\n| View | ${settings.devices.map(d=>d.name).join(' | ')} |\n| --- | ${settings.devices.map(()=>'---').join(' | ')} |\n${views.map(view=>`| ${view.title} | ${settings.devices.map(d=>`[Screenshot](${view.key}-${d.name}.png)`).join(' | ')} |`).join('\n')}\n\n${views.map(view=>`- **${view.title}:** ${view.description}`).join('\n')}\n\n${settings.devices.map(device=>`${device.name}: ${device.width} × ${device.height}`).join('; ')}. Images use native 1× pixels and include any page overflow. No location permissions or external data requests are needed.\n\nThe manifest records image dimensions, toggle states, browser version and the exported HTML's SHA-256 hash.\n\nCaptures happen automatically after changed visual exports. To explicitly record a version, run \`npm run capture:iteration\`. Each capture creates a new dated, numbered folder and keeps previous captures intact.\n`;
 await writeFile(path.join(staging,'README.md'),readme);
 await rename(staging,folder);completed=true;
 await packageVisualHistory();
 console.log(`Saved ${captures.length} full-page screenshots: ${path.relative(root,folder)}`);
}finally{await browser.close();if(!completed)await rm(staging,{recursive:true,force:true});}
