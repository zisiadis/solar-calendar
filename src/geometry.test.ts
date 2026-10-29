import {test} from 'node:test';
import assert from 'node:assert/strict';
import {daylightRadius,INNER_RADIUS,HOURS_TO_RADIUS,segment} from './geometry';
test('day-length radii use a common linear zero-based scale',()=>{
 assert.equal(daylightRadius(0),INNER_RADIUS);
 assert.equal(daylightRadius(12),353);
 assert.equal(daylightRadius(24),425);
 for(const hours of [0,.01,1,6,9.1,12,18,24])assert.ok(Math.abs((daylightRadius(hours)-INNER_RADIUS)/HOURS_TO_RADIUS-hours)<1e-12);
 assert.equal(daylightRadius(6)-INNER_RADIUS,(daylightRadius(12)-INNER_RADIUS)/2);
});
test('variable annular segments preserve their common circular inner edge',()=>{
 for(const hours of [0,6,12,24]){
  const path=segment(0,1,daylightRadius(hours));
  assert.ok(path.startsWith(`M500,${500-daylightRadius(hours)} A${daylightRadius(hours)},${daylightRadius(hours)}`));
  assert.ok(path.includes(`A${INNER_RADIUS},${INNER_RADIUS} 0 0 0 500,219 Z`));
 }
});
