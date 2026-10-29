import { useEffect, useRef, useState } from 'react';
import { latitudeLabel, parseLatitude, searchPlaces, type Place, type SolarLocation } from './location';
interface Props { location: SolarLocation; onChange: (location: SolarLocation) => void }
export function LocationControl({ location, onChange }: Props) {
 const [open, setOpen] = useState(false);
 const [query, setQuery] = useState('');
 const [places, setPlaces] = useState<Place[]>([]);
 const [searchState, setSearchState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
 const [locating, setLocating] = useState(false);
 const [notice, setNotice] = useState('');
 const input = useRef<HTMLInputElement>(null);
 const changeButton = useRef<HTMLButtonElement>(null);
 const panel = useRef<HTMLDivElement>(null);
 const request = useRef(0);
 const onChangeRef = useRef(onChange);
 onChangeRef.current = onChange;
 const latitude = parseLatitude(query);
 function locate(showError = false) {
  if (!navigator.geolocation || !window.isSecureContext) { if(showError) setNotice('Browser location is unavailable.'); return; }
  const id = ++request.current;
  setLocating(true); setNotice('');
  navigator.geolocation.getCurrentPosition(position => {
   if (id !== request.current) return;
   onChangeRef.current({ latitude: Math.round(position.coords.latitude * 10000) / 10000, longitude: Math.round(position.coords.longitude * 10000) / 10000, label: 'Your location', source: 'device' });
   setLocating(false); setOpen(false); setNotice('');
  }, error => {
   if (id !== request.current) return;
   setLocating(false);
   if(showError) setNotice(error.code === 1 ? 'Location access is unavailable.' : 'Location could not be found.');
  }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
 }
 // Ask on arrival; the browser controls whether permission is needed.
 useEffect(() => {
  locate();
  return () => { request.current++; };
 }, []);
 useEffect(() => {
  if (!open) return;
  input.current?.focus();
  function outside(event: PointerEvent) {
   if (!panel.current?.contains(event.target as Node)) setOpen(false);
  }
  document.addEventListener('pointerdown', outside);
  return () => document.removeEventListener('pointerdown', outside);
 }, [open]);
 useEffect(() => {
  setPlaces([]); setSearchState('idle');
  if (!open || query.trim().length < 2 || latitude !== null) return;
  const controller = new AbortController();
  setSearchState('loading');
  const timer = setTimeout(() => {
   searchPlaces(query.trim(), controller.signal).then(results => {
    if (!controller.signal.aborted) { setPlaces(results); setSearchState('done'); }
   }).catch(() => { if (!controller.signal.aborted) setSearchState('error'); });
  }, 150);
  return () => { clearTimeout(timer); controller.abort(); };
 }, [query, open, latitude]);
 function choose(value: SolarLocation) {
  request.current++; setLocating(false); setNotice(''); onChange(value); setOpen(false); setQuery(''); changeButton.current?.focus();
 }
 const direct = latitude !== null ? { latitude, longitude: 0, label: 'Custom latitude', source: 'latitude' as const } : null;
 return <section className="location-section" aria-label="Calendar location">
  <span className="eyebrow">LOCATION</span>
  <div className="location-line">
   <p className="location-current"><span className="location-latitude">{latitudeLabel(location.latitude)}</span><span className="location-dot">·</span><span className="location-name">{location.label}</span></p>
   <div className="location-actions"><button type="button" className="text-button" disabled={locating} onClick={() => locate(true)}>{locating ? 'Finding your location…' : 'Use my location'}<svg aria-hidden="true" className="location-arrow" width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 8 8 2M2.5 2H8v5.5" stroke="currentColor" strokeWidth=".8"/></svg></button>
   <div className="place-control" ref={panel} onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); changeButton.current?.focus(); } }}>
    <button type="button" ref={changeButton} className="text-button" aria-expanded={open} aria-controls="place-panel" onClick={() => { request.current++; setLocating(false); setOpen(!open); setQuery(''); }}>Change place<span aria-hidden="true" className="location-chevron">{open ? '−' : '+'}</span></button>
    {open && <div className="place-panel" id="place-panel" onBlur={e => { if (e.relatedTarget && !panel.current?.contains(e.relatedTarget as Node)) setOpen(false); }}>
     <label htmlFor="place-search" className="eyebrow">EXPLORE THE LIGHT SOMEWHERE ELSE</label>
     <form onSubmit={e => { e.preventDefault(); if (direct) choose(direct); else if (places[0]) { const place=places[0]; choose({latitude:place.latitude,longitude:place.longitude,label:[place.name,place.country].filter(Boolean).join(', '),source:'search'}); } }}>
      <input id="place-search" type="text" ref={input} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search city or latitude…" autoComplete="off" aria-describedby="place-help" />
     </form>
     <div className="place-results" aria-live="polite" aria-busy={searchState === 'loading'}>
      {direct && <button type="button" className="place-result" onClick={() => choose(direct)}><span>Use this latitude</span><span>{latitudeLabel(direct.latitude)} ↵</span></button>}
      {places.map(place => <button type="button" className="place-result" key={place.id} onClick={() => choose({ latitude: place.latitude, longitude: place.longitude, label: [place.name, place.country].filter(Boolean).join(', '), source: 'search' })}><span>{place.name}<small>{[place.admin1, place.country].filter(Boolean).join(', ')}</small></span><span>{latitudeLabel(place.latitude)}</span></button>)}
      {searchState === 'loading' && <p className="search-message">Looking for places…</p>}
      {searchState === 'done' && !places.length && <p className="search-message">No places found. Try a fuller name or enter a latitude.</p>}
      {searchState === 'error' && <p className="search-message">Place search is unavailable. Try again, or enter a latitude.</p>}
     </div>
     <p className="place-help" id="place-help">A city, or a latitude like 51.5° N or 33.9° S.</p>
     {places.length > 0 && <a className="search-credit" href="https://www.geonames.org/" target="_blank" rel="noreferrer">City data: GeoNames · works offline</a>}
    </div>}
   </div></div>
  </div>
  {notice && <p role="status" className="location-notice">{notice}</p>}
 </section>;
}
