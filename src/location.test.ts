import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseLatitude,latitudeLabel,seasonLabels,searchPlaces} from './location';
test('parses coordinates and rejects invalid latitudes',()=>{
 for(const [input,expected] of [['51.5° N',51.5],['33.9° S',-33.9],['-90',-90],['0',0],['90 N',90]] as const)assert.equal(parseLatitude(input),expected);
 for(const input of ['91','-91','London','','NaN','12.5.5'])assert.equal(parseLatitude(input),null);
 assert.equal(latitudeLabel(-33.9),'33.9° S');assert.equal(latitudeLabel(0),'0°');
});
test('season labels change with hemisphere',()=>{
 assert.equal(seasonLabels(40).top,'WINTER SOLSTICE');assert.equal(seasonLabels(-40).top,'SUMMER SOLSTICE');
 assert.equal(seasonLabels(-40).right,'AUTUMN');assert.equal(seasonLabels(-40).left,'SPRING');
 assert.equal(seasonLabels(0).top,'DECEMBER SOLSTICE');
});
test('real bundled city search works without network',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>{throw new Error('No internet');};
 try {
  const signal=new AbortController().signal;
  const london=await searchPlaces('London',signal);assert.equal(london[0].name,'London');assert.equal(london[0].country,'United Kingdom');assert.ok(Math.abs(london[0].latitude-51.5)<.1);
  const madrid=await searchPlaces('Madrid',signal);assert.equal(madrid[0].country,'Spain');assert.ok(Math.abs(madrid[0].latitude-40.4)<.1);
  const sydney=await searchPlaces('Sydney Australia',signal);assert.equal(sydney[0].country,'Australia');assert.ok(sydney[0].latitude<0);
  const reykjavik=await searchPlaces('Reykjavik',signal);assert.ok(reykjavik.some(p=>p.name==='Reykjavík'));
  assert.deepEqual(await searchPlaces('zzzzzzzzzz',signal),[]);
  assert.deepEqual(await searchPlaces('',signal),[]);
 } finally {globalThis.fetch=original;}
});
test('cancelled city searches are rejected',async()=>{
 const controller=new AbortController();controller.abort();
 await assert.rejects(searchPlaces('London',controller.signal),{name:'AbortError'});
});
