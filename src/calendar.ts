export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export interface CalendarConfig { year: number; anchors: { month: number; day: number; fraction?: number }[] }
// Kept for reference geometry/tests. The application uses astronomicalCalendar(year).
export const REFERENCE: CalendarConfig = { year: 2025, anchors: [{month:12,day:21},{month:3,day:20},{month:6,day:21},{month:9,day:22}] };
export const daysInMonth = (year:number, month:number) => new Date(Date.UTC(year,month,0)).getUTCDate();
const ordinal = (year:number,month:number,day:number) => (Date.UTC(year,month-1,day)-Date.UTC(year,0,1))/86400000;
function mapping(config:CalendarConfig) {
 const {year,anchors}=config;
 const count=(Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/86400000;
 const origin=ordinal(year,anchors[0].month,anchors[0].day)+(anchors[0].fraction??0);
 const offset=(n:number)=>(n-origin+count)%count;
 const stops=[...anchors.map(a=>offset(ordinal(year,a.month,a.day)+(a.fraction??0))),count];
 const angleAt=(n:number)=>{
  const x=offset(n),q=stops.findIndex((s,i)=>i<4&&x>=s&&x<stops[i+1]);
  return q*90+(x-stops[q])/(stops[q+1]-stops[q])*90;
 };
 return {count,angleAt};
}
export function calendarDateAngle(config:CalendarConfig,month:number,day:number,fraction=0) {
 return mapping(config).angleAt(ordinal(config.year,month,day)+fraction);
}
export function createCalendar(config:CalendarConfig=REFERENCE) {
 const {year}=config;
 const {count,angleAt}=mapping(config);
 return Array.from({length:count},(_,index)=>{
  const date=new Date(Date.UTC(year,0,index+1)),angle=angleAt(index);
  const next=angleAt((index+1)%count),end=next>angle?next:next+360;
  return {year,index,month:date.getUTCMonth()+1,day:date.getUTCDate(),angle,end,mid:(angle+end)/2};
 });
}
export type SolarDay=ReturnType<typeof createCalendar>[number];
export const dateLabel=(d:SolarDay)=>`${MONTHS[d.month-1]} ${d.day}`;
