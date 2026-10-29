import { readFile, readdir, writeFile } from 'node:fs/promises';
const assets=await readdir(new URL('../dist/assets/',import.meta.url));
const css=await readFile(new URL(`../dist/assets/${assets.find(name=>name.endsWith('.css'))}`,import.meta.url),'utf8');
const js=await readFile(new URL(`../dist/assets/${assets.find(name=>name.endsWith('.js'))}`,import.meta.url),'utf8');
const cityLicense=await readFile(new URL('../CITY-DATA-LICENSE.txt',import.meta.url),'utf8');
const astronomyLicense=await readFile(new URL('../ASTRONOMY-LICENSE.txt',import.meta.url),'utf8');
const safeScript=js.replaceAll('</script','<'+String.fromCharCode(92)+'/script');
// Validation tables live in references/, not in the page downloaded by visitors.
const html=`<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="theme-color" content="#f8f7f2"><meta name="description" content="An astronomical calendar of daylight at your latitude."><title>The Solar Year</title><style>${css}</style></head><body><div id="root"></div><script type="module">${safeScript}</script><!--\n${cityLicense}\n${astronomyLicense}\n--></body></html>`;
await writeFile(new URL('../solar-year.html',import.meta.url),html);
console.log(`Created solar-year.html (${(Buffer.byteLength(html)/1024/1024).toFixed(2)} MB).`);
