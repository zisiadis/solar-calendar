import {Body,GeoVector,RotateVector,Rotation_EQJ_EQD,EquatorFromVector,Seasons} from 'astronomy-engine';
import {writeFile} from 'node:fs/promises';
const year=Number(process.argv[2]??new Date().getFullYear());
if(!Number.isInteger(year)||year<1900||year>2100)throw Error('Use a reference year between 1900 and 2100.');
const rows=[];
for(let time=Date.UTC(year,0,1,12);time<Date.UTC(year+1,0,1);time+=86400000){
 const date=new Date(time);
 const vector=RotateVector(Rotation_EQJ_EQD(date),GeoVector(Body.Sun,date,true));
 const eq=EquatorFromVector(vector);
 rows.push({utc:date.toISOString(),rightAscensionHours:eq.ra,declinationDegrees:eq.dec,distanceAU:eq.dist});
}
const seasons=Seasons(year);
const data={source:'Calculated from pinned Astronomy Engine 2.1.19 coefficients; validated against archived NASA/JPL Horizons DE431mx. These rows are local model output, not a direct JPL download.',frame:'Geocentric apparent equatorial of date',epoch:'12:00 UTC each date',year,events:Object.fromEntries(['mar_equinox','jun_solstice','sep_equinox','dec_solstice'].map(key=>[key,seasons[key].date.toISOString()])),rows};
await writeFile(new URL(`../references/astronomy/solar-${year}.json`,import.meta.url),JSON.stringify(data,null,2)+'\n');
console.log(`Saved ${rows.length} dated solar positions and four seasonal events.`);
