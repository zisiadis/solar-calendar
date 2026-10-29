const stops = [[37,83,119],[78,120,147],[150,168,169],[201,191,146],[216,179,89],[214,166,57]];
export function daylightColor(hours:number) {
 // A shared scale lets latitude change the contrast, with neutral equatorial light.
 const min=9.15,max=14.85;
 const t=Math.max(0,Math.min(1,(hours-min)/(max-min)))*(stops.length-1);
 const i=Math.min(stops.length-2,Math.floor(t)),f=t-i;
 return `rgb(${stops[i].map((v,j)=>Math.round(v+(stops[i+1][j]-v)*f+1e-9)).join(',')})`;
}
export function formatDaylight(hours:number) { const minutes=Math.round(hours*60); return `${Math.floor(minutes/60)}h ${String(minutes%60).padStart(2,'0')}m`; }
