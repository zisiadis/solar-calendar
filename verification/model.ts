// Node-only adapter. The website never imports this module or its fixtures.
import {readFileSync} from 'node:fs';
import {geometricDaylight,MODEL_VERSION} from '../src/astronomy';
import {Seasons} from 'astronomy-engine';
const input=JSON.parse(readFileSync(0,'utf8'));
const days=input.cases.map((c:{year:number;month:number;day:number;latitude:number;longitude:number})=>geometricDaylight(c,c.latitude,c.longitude)*3600);
const seasons=Object.fromEntries(input.years.map((year:number)=>{
 const s=Seasons(year);
 return [year,[s.mar_equinox,s.jun_solstice,s.sep_equinox,s.dec_solstice].map(t=>t.date.toISOString())];
}));
process.stdout.write(JSON.stringify({model:MODEL_VERSION,days,seasons}));
