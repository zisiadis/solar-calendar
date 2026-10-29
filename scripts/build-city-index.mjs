import cities from 'all-the-cities';
import {writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
const rows=cities.filter(c=>c.name && c.country && Number.isFinite(c.loc?.coordinates?.[1])).sort((a,b)=>b.population-a.population).map(c=>[c.name,c.country,Number(c.loc.coordinates[1].toFixed(4)),['US','CA','AU'].includes(c.country)?c.adminCode:'',Number(c.loc.coordinates[0].toFixed(4))]);
const encoded=gzipSync(JSON.stringify(rows),{level:9}).toString('base64');
const source=`// Compressed GeoNames index via all-the-cities. See CITY-DATA-LICENSE.txt.
export type CityRow=[string,string,number,string,number];
let cached:Promise<CityRow[]>|undefined;
export function loadCityRows():Promise<CityRow[]> {
 if(!cached) cached=(async()=>{
  const bytes=Uint8Array.from(atob('${encoded}'),c=>c.charCodeAt(0));
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).json() as CityRow[];
 })().catch(error=>{cached=undefined;throw error;});
 return cached;
}
`;
await writeFile(new URL('../src/cities-data.ts',import.meta.url),source);
console.log(`Bundled ${rows.length} cities as ${(encoded.length/1024/1024).toFixed(2)} MB compressed data, decoded on first search.`);
