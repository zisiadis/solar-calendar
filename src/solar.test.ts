import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCalendar,calendarDateAngle,REFERENCE,daysInMonth} from './calendar';
import {daylightColor} from './daylight';
import {astronomicalCalendar,geometricDaylight} from './astronomy';
const days=createCalendar();
test('365 unique dates, exact month lengths',()=>{assert.equal(days.length,365);assert.equal(new Set(days.map(d=>`${d.month}-${d.day}`)).size,365);for(let m=1;m<=12;m++)assert.equal(days.filter(d=>d.month===m).length,daysInMonth(2025,m));});
test('seasonal anchors are exact cardinal positions',()=>{REFERENCE.anchors.forEach((a,i)=>assert.equal(days.find(d=>d.month===a.month&&d.day===a.day)!.angle,i*90));});
test('segments tile a complete clockwise circle without gaps',()=>{const sorted=[...days].sort((a,b)=>a.angle-b.angle);assert.equal(sorted[0].angle,0);assert.equal(sorted.at(-1)!.end,360);sorted.forEach((d,i)=>{assert.ok(d.end>d.angle);if(i)assert.equal(sorted[i-1].end,d.angle);});});
test('leap years are supported by calendar configuration',()=>{const leap=createCalendar({...REFERENCE,year:2024});assert.equal(leap.length,366);assert.equal(leap.filter(d=>d.month===2).length,29);});
test('actual astronomical anchors map to exact cardinal points',()=>{
 const config=astronomicalCalendar(2026),actual=createCalendar(config);
 for(let i=0;i<4;i++){
  const a=config.anchors[i],d=actual.find(d=>d.month===a.month&&d.day===a.day)!;
  const eventAngle=calendarDateAngle(config,a.month,a.day,a.fraction);
  const unwrapped=eventAngle<d.angle?eventAngle+360:eventAngle;
  assert.ok(unwrapped>=d.angle && unwrapped<=d.end);
  assert.ok(Math.abs(eventAngle-i*90)<1e-8);
 }
 assert.ok(config.anchors.some(a=>(a.fraction??0)>0));
 const ordered=[...actual].sort((a,b)=>a.angle-b.angle);
 assert.ok(Math.abs(ordered.reduce((sum,d)=>sum+d.end-d.angle,0)-360)<1e-8);
 for(let i=1;i<ordered.length;i++)assert.ok(Math.abs(ordered[i-1].end-ordered[i].angle)<1e-8);
});
test('actual dates reverse southern daylight and preserve finite polar values',()=>{
 const winter={year:2026,month:12,day:21},summer={year:2026,month:6,day:21};
 assert.ok(geometricDaylight(winter,40)<10);assert.ok(geometricDaylight(summer,40)>14);
 assert.ok(geometricDaylight(winter,-40)>14);assert.ok(geometricDaylight(summer,-40)<10);
 for(const latitude of [-90,-89,-66.56,0,66.56,89,90])for(const date of [winter,summer,{year:2026,month:3,day:20}]){
  const h=geometricDaylight(date,latitude);assert.ok(Number.isFinite(h)&&h>=0&&h<=24);assert.ok(!daylightColor(h).includes('NaN'));
 }
 assert.equal(geometricDaylight(winter,90),0);assert.equal(geometricDaylight(summer,90),24);
});
test('longitude affects the sampled solar date; leap days calculate normally',()=>{
 const d={year:2026,month:3,day:20};
 assert.notEqual(geometricDaylight(d,60,-170),geometricDaylight(d,60,170));
 assert.ok(Number.isFinite(geometricDaylight({year:2024,month:2,day:29},51.5)));
 assert.throws(()=>geometricDaylight(d,91),RangeError);
});

test('full-year numerical coverage at polar boundaries and both hemispheres',()=>{
 const actual=createCalendar(astronomicalCalendar(2026));
 for(const latitude of [-90,-89.999,-66.56,0,66.56,89.999,90]){
  const values=actual.map(day=>geometricDaylight(day,latitude,179));
  assert.equal(values.length,365);assert.ok(values.every(h=>Number.isFinite(h)&&h>=0&&h<=24));
 }
});
