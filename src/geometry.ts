export const INNER_RADIUS=281;
export const HOURS_TO_RADIUS=6;
export const daylightRadius=(hours:number)=>INNER_RADIUS+hours*HOURS_TO_RADIUS;
export const point = (r:number,a:number) => { const t=(a-90)*Math.PI/180; return [500+r*Math.cos(t),500+r*Math.sin(t)]; };
export const arc = (r:number,a:number,b:number,reverse=false) => `M${point(r,a).join(',')} A${r},${r} 0 ${Math.abs(b-a)>180?1:0} ${reverse?0:1} ${point(r,b).join(',')}`;
export const segment = (a:number,b:number,outer:number) => `${arc(outer,a,b)} L${point(INNER_RADIUS,b).join(',')} A${INNER_RADIUS},${INNER_RADIUS} 0 0 0 ${point(INNER_RADIUS,a).join(',')} Z`;
