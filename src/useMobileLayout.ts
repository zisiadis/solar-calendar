import {useEffect,useState} from 'react';
export const MOBILE_QUERY='(max-width: 650px), (max-width: 1000px) and (max-height: 500px) and (pointer: coarse)';
export function useMobileLayout(){
 const [mobile,setMobile]=useState(()=>window.matchMedia(MOBILE_QUERY).matches);
 useEffect(()=>{const query=window.matchMedia(MOBILE_QUERY);const update=()=>setMobile(query.matches);query.addEventListener('change',update);update();return()=>query.removeEventListener('change',update);},[]);
 return mobile;
}
