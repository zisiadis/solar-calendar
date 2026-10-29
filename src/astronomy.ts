import { Body, Equator, Horizon, Observer, SearchAltitude, Seasons } from 'astronomy-engine';
import type { CalendarConfig, SolarDay } from './calendar';
const DAY_MS = 86400000;
export const MODEL_VERSION = 'astronomy-engine-2.1.19-geometric-v1';
export function astronomicalCalendar(year: number): CalendarConfig {
 const seasons = Seasons(year);
 const anchors = [seasons.dec_solstice, seasons.mar_equinox, seasons.jun_solstice, seasons.sep_equinox].map(event => {
  const d = event.date;
  return { month: d.getUTCMonth()+1, day: d.getUTCDate(), fraction: (d.getTime()-Date.UTC(year,d.getUTCMonth(),d.getUTCDate()))/DAY_MS };
 });
 return {year, anchors};
}
export function geometricSolarAltitude(time: Date, latitude: number, longitude: number): number {
 const observer = new Observer(latitude, longitude, 0);
 const equatorial = Equator(Body.Sun, time, observer, true, true);
 // No refraction argument: geometric topocentric altitude of the solar center.
 return Horizon(time, observer, equatorial.ra, equatorial.dec).altitude;
}
export function geometricDaylight(date: Pick<SolarDay,'year'|'month'|'day'>, latitude: number, longitude = 0): number {
 if (!Number.isFinite(latitude) || Math.abs(latitude)>90 || !Number.isFinite(longitude) || Math.abs(longitude)>180) throw new RangeError('Invalid geographic coordinates');
 const start = Date.UTC(date.year,date.month-1,date.day) - longitude/360*DAY_MS;
 const end = start + DAY_MS;
 const observer = new Observer(latitude,longitude,0);
 const crossings: {time:number; direction:number}[] = [];
 for (const direction of [1,-1]) {
  let cursor=start;
  // Account for a day with only one crossing, including polar transition days.
  for (let i=0; i<4 && cursor<end; i++) {
   const event=SearchAltitude(Body.Sun,observer,direction,new Date(cursor),(end-cursor)/DAY_MS,0);
   if (!event || event.date.getTime()>=end) break;
   const time=event.date.getTime();
   crossings.push({time:Math.max(start,time),direction});
   cursor=time+1000;
  }
 }
 crossings.sort((a,b)=>a.time-b.time);
 let above = geometricSolarAltitude(new Date(start+1),latitude,longitude)>0;
 let previous=start,lit=0;
 for (const crossing of crossings) {
  if (above) lit+=crossing.time-previous;
  above=crossing.direction===1;
  previous=crossing.time;
 }
 if (above) lit+=end-previous;
 return Math.max(0,Math.min(24,lit/3600000));
}
const memory = new Map<string,number[]>();
export function daylightForYear(days: SolarDay[], latitude: number, longitude = 0): number[] {
 const key=`solar-year.light.${MODEL_VERSION}.${days[0].year}.${latitude}.${longitude}`;
 const cached=memory.get(key);
 if (cached) return cached;
 try {
  const saved=JSON.parse(localStorage.getItem(key)??'null');
  if (Array.isArray(saved) && saved.length===days.length && saved.every(n=>typeof n==='number' && Number.isFinite(n) && n>=0 && n<=24)) {memory.set(key,saved);return saved;}
 } catch { /* Offline computations also work without storage. */ }
 const values=days.map(day=>geometricDaylight(day,latitude,longitude));
 memory.set(key,values);
 if (memory.size>6) memory.delete(memory.keys().next().value!);
 try {
  // Bound persistent caches to six recent locations, rather than growing forever.
  const prefix=`solar-year.light.${MODEL_VERSION}.`;
  const keys=Object.keys(localStorage).filter(k=>k.startsWith(prefix));
  while(keys.length>=6) localStorage.removeItem(keys.shift()!);
  localStorage.setItem(key,JSON.stringify(values));
 } catch { /* Storage is optional. */ }
 return values;
}
