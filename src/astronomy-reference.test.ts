import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Body,Equator,Horizon,Observer} from 'astronomy-engine';
import {geometricDaylight} from './astronomy';
const dir=new URL('../references/astronomy/',import.meta.url);
function read(name:string){return readFileSync(new URL(name,dir),'utf8');}
const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function rows(name:string){
 return read(name).split('$$SOE')[1].split('$$EOE')[0].trim().split('\n').map(line=>{
  const match=line.match(/^\s*(\d{4})-([A-Za-z]{3})-(\d{2})\s(\d{2}):(\d{2})\s[\* ACN][ mrts]\s*(.*)$/);
  assert.ok(match,`Unparsed reference row: ${line}`);
  const columns=match[6].trim().split(/\s+/).map(Number);
  assert.equal(columns.length,6);assert.ok(columns.every(Number.isFinite));
  return {date:new Date(Date.UTC(+match[1],months.indexOf(match[2]),+match[3],+match[4],+match[5])),columns};
 });
}
test('archived NASA/JPL files retain their recorded hashes and source headers',()=>{
 const manifest=JSON.parse(read('sources.json'));
 for(const file of manifest.files){
  assert.equal(createHash('sha256').update(read(file.file)).digest('hex'),file.sha256);
  assert.match(read(file.file),/Target body name: Sun \(10\).*DE431mx/);
 }
});
test('solar positions match 1900–2100 NASA/JPL reference within 1 arcminute',()=>{
 const data=rows('jpl-sun-1900-2100.txt');assert.ok(data.length>7000);
 const observer=new Observer(29,-81,10);let max=0;
 for(const {date,columns:c} of data){
  const eq=Equator(Body.Sun,date,observer,false,false);
  const raError=((eq.ra*15-c[0]+540)%360-180)*Math.cos(c[1]*Math.PI/180);
  const error=Math.hypot(raError,eq.dec-c[1])*3600;
  max=Math.max(max,error);assert.ok(error<60,`${date.toISOString()}: ${error} arcsec`);
 }
 console.log(`JPL astrometric solar position: ${data.length} epochs, max error ${max.toFixed(3)} arcseconds.`);
});
test('airless solar altitude and daily light match minute-resolution JPL output',()=>{
 const data=rows('jpl-airless-sun-2019.txt');assert.equal(data.length,2881);
 const observer=new Observer(0,0,0);let max=0;
 for(const {date,columns:c} of data){
  const eq=Equator(Body.Sun,date,observer,true,true);
  const altitude=Horizon(date,observer,eq.ra,eq.dec).altitude;
  const error=Math.abs(altitude-c[5])*3600;max=Math.max(max,error);assert.ok(error<60);
 }
 for(const day of [19,20]){
  const slice=data.filter(d=>d.date.getUTCDate()===day);const events:number[]=[];
  for(let i=1;i<slice.length;i++){
   const a=slice[i-1],b=slice[i];
   if(a.columns[5]*b.columns[5]<0)events.push(a.date.getTime()+(b.date.getTime()-a.date.getTime())*(-a.columns[5])/(b.columns[5]-a.columns[5]));
  }
  assert.equal(events.length,2);
  const expected=(events[1]-events[0])/3600000;
  const actual=geometricDaylight({year:2019,month:3,day},0,0);
  const seconds=Math.abs(expected-actual)*3600;assert.ok(seconds<10,`${day}: ${seconds}s`);
  console.log(`JPL airless daylight, 2019-03-${day}: duration error ${seconds.toFixed(3)} seconds.`);
 }
 console.log(`JPL airless altitude: ${data.length} epochs, max error ${max.toFixed(3)} arcseconds.`);
});
