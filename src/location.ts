import {loadCityRows} from './cities-data';
export interface SolarLocation { latitude: number; longitude?: number; label: string; source: 'default' | 'device' | 'search' | 'latitude' }
export const DEFAULT_LOCATION: SolarLocation = { latitude: 40, label: 'Default location', source: 'default' };
export const latitudeLabel = (latitude: number) => `${Math.abs(latitude).toFixed(1).replace(/\.0$/, '')}°${latitude === 0 ? '' : latitude < 0 ? ' S' : ' N'}`;
export function parseLatitude(input: string): number | null {
 const match = input.trim().match(/^([+-]?\d+(?:\.\d+)?)\s*°?\s*([NS])?$/i);
 if (!match) return null;
 let value = Number(match[1]);
 if (match[2]) value = Math.abs(value) * (match[2].toUpperCase() === 'S' ? -1 : 1);
 return Number.isFinite(value) && Math.abs(value) <= 90 ? value : null;
}
const storageKey = 'solar-year.location.v1';
export function readLocation(): SolarLocation {
 try {
  const value = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
  if (value && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90 && typeof value.label === 'string' && ['device','search','latitude'].includes(value.source) && (value.longitude === undefined || (Number.isFinite(value.longitude) && Math.abs(value.longitude)<=180))) {
   return value;
  }
 } catch { /* Storage may be unavailable in private browsing or a local file. */ }
 return DEFAULT_LOCATION;
}
export function saveLocation(location: SolarLocation) {
 try { localStorage.setItem(storageKey, JSON.stringify(location)); } catch { /* The calendar still works without persistence. */ }
}
export interface Place { id: number; name: string; latitude: number; longitude: number; country?: string; admin1?: string }
const normalizePlace = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countries=new Map<string,{name:string;normalized:string}>();
function countryInfo(code:string) {
 let info=countries.get(code);
 if(!info){const name=countryNames.of(code)??code;info={name,normalized:normalizePlace(name)};countries.set(code,info);}
 return info;
}
let indexPromise:Promise<(Place & {normalized:string;full:string})[]>|undefined;
function cityIndex() {
 if(!indexPromise) indexPromise=loadCityRows().then(rows=>rows.map(([name,code,latitude,region,longitude],id)=>{
  const info=countryInfo(code),country=info.name;
  const normalized=normalizePlace(name);
  return {id,name,latitude,longitude,country,admin1:region||undefined,normalized,
   full:`${normalized} ${info.normalized} ${code.toLowerCase()} ${region.toLowerCase()}`};
 })).catch(error=>{indexPromise=undefined;throw error;});
 return indexPromise;
}
// Migrate a saved city from versions that retained latitude alone, without
// loading the city database during ordinary page startup.
export async function restoreCityLongitude(location:SolarLocation):Promise<SolarLocation> {
 if(location.source!=='search'||location.longitude!==undefined)return location;
 const match=(await cityIndex()).find(city=>Math.abs(city.latitude-location.latitude)<.00011 && `${city.name}, ${city.country}`===location.label);
 return match?{...location,longitude:match.longitude}:location;
}
// Population-ranked local GeoNames index: no external search service required.
export async function searchPlaces(query: string, signal: AbortSignal): Promise<Place[]> {
 if (signal.aborted) throw new DOMException('Search cancelled', 'AbortError');
 const nameQuery = normalizePlace(query);
 const terms = nameQuery.split(' ').filter(Boolean);
 if (!terms.length) return [];
 const exact: Place[] = [], prefix: Place[] = [], partial: Place[] = [];
 const cities=await cityIndex();
 if(signal.aborted)throw new DOMException('Search cancelled','AbortError');
 for (const city of cities) {
  if (!terms.every(term => city.full.includes(term))) continue;
  const target = city.normalized === nameQuery ? exact : city.normalized.startsWith(terms[0]) ? prefix : partial;
  if (target.length < 6) target.push({ id: city.id, name: city.name, latitude: city.latitude, longitude: city.longitude, country: city.country, admin1: city.admin1 });
 }
 return [...exact, ...prefix, ...partial].slice(0, 6);
}
export function seasonLabels(latitude: number) {
 if (latitude === 0) return { top: 'DECEMBER SOLSTICE', bottom: 'JUNE SOLSTICE', left: 'SEPTEMBER', right: 'MARCH' };
 return latitude < 0
  ? { top: 'SUMMER SOLSTICE', bottom: 'WINTER SOLSTICE', left: 'SPRING', right: 'AUTUMN' }
  : { top: 'WINTER SOLSTICE', bottom: 'SUMMER SOLSTICE', left: 'AUTUMN', right: 'SPRING' };
}
