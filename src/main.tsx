import React, { useEffect, useMemo, useRef, useState } from 'react';
import {createRoot} from 'react-dom/client';
import {createCalendar, dateLabel, MONTHS, type SolarDay} from './calendar';
import {daylightColor,formatDaylight} from './daylight';
import {arc,point,segment,daylightRadius,INNER_RADIUS} from './geometry';
import {LocationControl} from './LocationControl';
import {latitudeLabel, readLocation, restoreCityLongitude, saveLocation, seasonLabels, type SolarLocation} from './location';
import {astronomicalCalendar, daylightForYear} from './astronomy';
import {useMobileLayout} from './useMobileLayout';
import './style.css';
const now=new Date();
const year=now.getFullYear();
const days=createCalendar(astronomicalCalendar(year));
const today=days.find(d=>d.month===now.getMonth()+1 && d.day===now.getDate()) ?? days[58];
function SolarCalendar({latitude,daylight,showReference,active,selected,onHover,onSelect,mobile}:{mobile:boolean;latitude:number;daylight:number[];showReference:boolean;active:SolarDay|null;selected:SolarDay|null;onHover:(day:SolarDay|null)=>void;onSelect:(day:SolarDay|null)=>void}) {
 const [focusIndex,setFocusIndex]=useState(today.index);
 const svg=useRef<SVGSVGElement>(null);
 const drag=useRef<number|null>(null);
 const [svgWidth,setSvgWidth]=useState(390);
 useEffect(()=>{const el=svg.current;if(!el)return;const resize=()=>setSvgWidth(el.getBoundingClientRect().width);resize();const observer=new ResizeObserver(resize);observer.observe(el);return()=>observer.disconnect();},[]);
 const bound=Math.max(...daylight.map(daylightRadius),showReference?daylightRadius(12):0)+48;
 const unitsPerPixel=2*bound/svgWidth;
 function explore(event:React.PointerEvent<SVGCircleElement>){
  const matrix=svg.current?.getScreenCTM();if(!matrix)return;
  const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
  if(Math.hypot(p.x-500,p.y-500)<180)return;
  const angle=(Math.atan2(p.x-500,500-p.y)*180/Math.PI+360)%360;
  const day=days.find(day=>{const a=angle<day.angle?angle+360:angle;return a>=day.angle&&a<day.end;});
  if(day){onSelect(day);onHover(day);}
 }
 function finish(event:React.PointerEvent<SVGCircleElement>){
  if(drag.current!==event.pointerId)return;
  drag.current=null;onHover(null);
  if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
 }
 const refs=useRef<(SVGPathElement|null)[]>([]);
 function key(event:React.KeyboardEvent<SVGPathElement>,day:SolarDay) {
  const delta=event.key==='ArrowRight'||event.key==='ArrowDown'?1:event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:0;
  if(delta || event.key==='Home' || event.key==='End') {event.preventDefault();const i=delta?(day.index+delta+days.length)%days.length:event.key==='Home'?0:days.length-1;setFocusIndex(i);refs.current[i]?.focus();}
  if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect(selected?.index===day.index?null:day);}
  if(event.key==='Escape'){onSelect(null);onHover(null);event.currentTarget.blur();}
 }
 const outerRadius=(index:number)=>daylightRadius(daylight[index]);
 const radiusAt=(angle:number)=>{
  const day=days.find(day=>{const a=angle<day.angle?angle+360:angle;return a>=day.angle&&a<day.end;});
  return outerRadius(day?.index??0);
 };
 const marker=point(outerRadius(today.index)+12,today.mid);
 const referenceLabel=point(daylightRadius(12)+10,45);
 // Match the visual gap to each label's shape, keeping optional guides clear.
 const labelRadius=(angle:number,gap:number,clearance:number)=>{
  const contour=radiusAt(angle),desired=contour+gap,reference=daylightRadius(12);
  if(!showReference||Math.abs(desired-reference)>=clearance)return desired;
  const inward=reference-clearance;
  return inward-contour>=gap-5?inward:reference+clearance;
 };
 const top=point(mobile?radiusAt(0)+22:labelRadius(0,28,16),0);
 const bottom=point(mobile?radiusAt(180)+32:labelRadius(180,34,16),180);
 const left=point(mobile?bound-23:labelRadius(270,46,28),270);
 const right=point(mobile?bound-23:labelRadius(90,46,28),90);
 const seasons=seasonLabels(latitude);
 return <svg ref={svg} className="solar-calendar" viewBox={mobile?`${500-bound} ${500-bound} ${2*bound} ${2*bound}`:"0 0 1000 1000"} role="group" aria-label="The Solar Year" aria-describedby="calendar-description" xmlns="http://www.w3.org/2000/svg">
  <desc id="calendar-description">{days.length} days in {year}, clockwise from the December solstice at the top. {seasons.top.toLowerCase()} at the top, {seasons.bottom.toLowerCase()} at the bottom. Use arrow keys to explore days and Enter to select. Daylight at {latitudeLabel(latitude)}. Radial segment length is proportional to daylight: six SVG units per hour from the fixed inner circle. {showReference?'The reference circle marks twelve hours.':''}</desc>
  <defs>{days.filter(d=>d.day===1).map(d=> { const lower=d.angle>90&&d.angle<270;return <path key={d.month} id={`month-${d.month}`} d={lower?arc(253,d.angle+15,d.angle+1,true):arc(253,d.angle+1,d.angle+16)}/>; })}</defs>
  <g aria-label="Days of the year">{days.map(d=><path key={d.index} ref={el=>{refs.current[d.index]=el;}} d={segment(d.angle,d.end,outerRadius(d.index))} data-mid={d.mid} data-hours={daylight[d.index]} data-outer-radius={outerRadius(d.index)} fill={daylightColor(daylight[d.index])} stroke="var(--paper)" strokeWidth=".48" className={`day ${active?.index===d.index?'active':''} ${selected?.index===d.index?'selected':''}`} role="button" aria-label={`${dateLabel(d)}, ${formatDaylight(daylight[d.index])} of daylight${d.index===today.index?', today':''}`} aria-pressed={selected?.index===d.index} tabIndex={focusIndex===d.index?0:-1} onPointerEnter={e=>{if(e.pointerType!=='touch')onHover(d);}} onPointerLeave={()=>onHover(null)} onFocus={()=>{setFocusIndex(d.index);onHover(d);}} onBlur={()=>onHover(null)} onKeyDown={e=>key(e,d)} onClick={()=>onSelect(selected?.index===d.index?null:d)}/>)}</g>
  <g aria-hidden="true" className="zero-day-targets">{days.filter(day=>daylight[day.index]<1).map(day=><path key={day.index} d={segment(day.angle,day.end,INNER_RADIUS+12)} fill="transparent" onPointerEnter={e=>{if(e.pointerType!=='touch')onHover(day);}} onPointerLeave={()=>onHover(null)} onClick={()=>onSelect(selected?.index===day.index?null:day)}/>)}</g>
  {showReference && <g className="daylight-reference" pointerEvents="none"><circle cx="500" cy="500" r={daylightRadius(12)}><title>12 hours of geometric daylight</title></circle><text style={mobile?{fontSize:9*unitsPerPixel}:undefined} x={referenceLabel[0]} y={referenceLabel[1]} dominantBaseline="middle" textAnchor="start" aria-hidden="true">12 h</text></g>}
  <g className="months" aria-hidden="true" style={mobile?{fontSize:10.5*unitsPerPixel,letterSpacing:.65*unitsPerPixel}:undefined}>{days.filter(d=>d.day===1).map(d=><g key={d.month}><path d={`M${point(266,d.angle)} L${point(279,d.angle)}`} className="month-divider"/>{mobile?<text x={point(253,d.angle+8)[0]} y={point(253,d.angle+8)[1]} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${(d.angle+8)%360>90&&(d.angle+8)%360<270?(d.angle+8)%360-180:(d.angle+8)%360} ${point(253,d.angle+8)[0]} ${point(253,d.angle+8)[1]})`}>{MONTHS[d.month-1].slice(0,3).toUpperCase()}</text>:<text><textPath href={`#month-${d.month}`} startOffset={d.angle>90&&d.angle<270?'100%':'0'} textAnchor={d.angle>90&&d.angle<270?'end':'start'}>{MONTHS[d.month-1].slice(0,3).toUpperCase()}</textPath></text>}</g>)}</g>
  <g className="center-title" aria-hidden="true"><text x="500" y="482" className="the">THE</text><text x="500" y="525" className="year">SOLAR YEAR</text></g>
  <circle cx={marker[0]} cy={marker[1]} r="2.8" className="today-marker" aria-label={`Today · ${dateLabel(today)}`}/>
  <g className="season-notches" aria-hidden="true">{[0,90,180,270].map(angle=>{
   const radius=radiusAt(angle);
   const start=point(radius+4,angle),end=point(radius+14,angle);
   return <line key={angle} x1={start[0]} y1={start[1]} x2={end[0]} y2={end[1]}/>;
  })}</g>
  <g className="seasons" aria-hidden="true" style={mobile?{fontSize:10*unitsPerPixel,letterSpacing:.7*unitsPerPixel}:undefined}><text x={top[0]} y={top[1]}>{seasons.top}</text><text x={bottom[0]} y={bottom[1]}>{seasons.bottom}</text>{!mobile&&<><text x={left[0]} y={left[1]-5}><tspan x={left[0]}>{seasons.left}</tspan><tspan x={left[0]} dy="17">EQUINOX</tspan></text><text x={right[0]} y={right[1]-5}><tspan x={right[0]}>{seasons.right}</tspan><tspan x={right[0]} dy="17">EQUINOX</tspan></text></>}</g>
  {mobile&&<circle className="touch-wheel" cx="500" cy="500" r={(232+bound-27)/2} fill="none" stroke="transparent" strokeWidth={bound-27-232} aria-hidden="true"
   onPointerDown={event=>{if(!event.isPrimary||drag.current!==null)return;drag.current=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);explore(event);}}
   onPointerMove={event=>{if(drag.current===event.pointerId)explore(event);}}
   onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={event=>{if(drag.current===event.pointerId){drag.current=null;onHover(null);}}}/>}
 </svg>;
}
function App(){
 const [hover,setHover]=useState<SolarDay|null>(null),[selected,setSelected]=useState<SolarDay|null>(null);
 const [showReference,setShowReference]=useState(false);
 const mobile=useMobileLayout();
 const [location,setLocation]=useState<SolarLocation>(readLocation);
 useEffect(()=>{
  let live=true;
  if(location.source==='search'&&location.longitude===undefined)restoreCityLongitude(location).then(restored=>{
   if(live&&restored!==location){setLocation(current=>current===location?restored:current);saveLocation(restored);}
  }).catch(()=>{});
  return ()=>{live=false;};
 },[location]);
 const updateLocation=(value:SolarLocation)=>{setLocation(value);saveLocation(value);};
 const daylight=useMemo(()=>daylightForYear(days,location.latitude,location.longitude??0),[location.latitude,location.longitude]);
 const displayed=hover??selected??today;
 return <main>
 <section className="artwork" aria-label="Interactive solar calendar"><SolarCalendar latitude={location.latitude} daylight={daylight} showReference={showReference} active={hover} selected={selected} onHover={setHover} onSelect={setSelected} mobile={mobile}/>
 </section>
 <section className="mobile-readout" aria-label="Day details">
  <div><span className="mobile-state">{hover?'EXPLORING':selected?'SELECTED DAY':'TODAY'}</span><h1>{dateLabel(displayed)}</h1></div>
  <div className="mobile-daylight"><p className="mobile-duration" aria-live="polite" aria-atomic="true"><span className="sr-only">{dateLabel(displayed)}: </span>{formatDaylight(daylight[displayed.index])}</p><span className="mobile-light-caption">of daylight</span></div>
 </section>
 <section className="day-readout" aria-label="Day details"><div className="readout-date"><span className="eyebrow">{hover?'EXPLORING':selected?'SELECTED DAY':'TODAY'}<span className="tiny-dot"/></span><h1>{dateLabel(displayed)}</h1></div><div className="readout-light"><span className="eyebrow" title="Solar center above the geometric horizon; no atmosphere or terrain. Calculated locally with Astronomy Engine and checked against archived NASA/JPL Horizons tables.">DAYLIGHT</span><p aria-live="polite" aria-atomic="true"><span className="sr-only">{dateLabel(displayed)}: </span>{formatDaylight(daylight[displayed.index])}<span className="daylight-unit">of light</span></p><div className="view-options"><button type="button" className="view-toggle" role="switch" aria-checked={showReference} aria-label="Show 12-hour line" onClick={()=>setShowReference(value=>!value)}><span className="view-toggle-track" aria-hidden="true"/><span>12-hour line</span></button></div></div><LocationControl mobile={mobile} location={location} onChange={updateLocation}/></section>
 </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
