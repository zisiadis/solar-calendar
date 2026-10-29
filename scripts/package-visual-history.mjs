import {readFile,writeFile,readdir,chmod} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {zipSync} from 'fflate';
const root=fileURLToPath(new URL('../',import.meta.url));
const directory=path.join(root,'docs','iterations');
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function packageVisualHistory(){
 const iterations=[];
 for(const entry of await readdir(directory,{withFileTypes:true})){
  if(!entry.isDirectory()||entry.name.startsWith('.'))continue;
  try{const manifest=JSON.parse(await readFile(path.join(directory,entry.name,'manifest.json'),'utf8'));iterations.push({folder:entry.name,...manifest});}
  catch(error){if(error.code!=='ENOENT')throw error;}
 }
 iterations.sort((a,b)=>a.folder.localeCompare(b.folder));
 const intro='# Visual iteration archive\n\nEvery completed visual change is documented automatically. Each folder preserves all desktop/mobile toggle states, a description and capture metadata. Earlier snapshots are never overwritten.\n\n[Open the offline gallery](index.html)\n\n';
 await writeFile(path.join(directory,'README.md'),intro+iterations.map(m=>`- [${m.title??m.folder}](${m.folder}/README.md) — ${m.summary??'Initial three-view screenshot set.'}`).join('\n')+'\n');
 const sections=iterations.map(m=>`<section><header><p class="meta">${escape(m.folder)}</p><h2>${escape(m.title??'Initial toggle views')}</h2><p>${escape(m.summary??'Three views, on desktop and mobile.')}</p><a href="${encodeURIComponent(m.folder)}/README.md">Change notes</a></header><div class="captures">${m.captures.map(c=>`<figure><a href="${encodeURIComponent(m.folder)}/${encodeURIComponent(c.file)}"><img loading="lazy" src="${encodeURIComponent(m.folder)}/${encodeURIComponent(c.file)}" alt="${escape(c.view)} — ${escape(c.device)}" width="${c.width}" height="${c.height}"></a><figcaption>${escape(c.view)} · ${escape(c.device)} · ${c.width} × ${c.height}</figcaption></figure>`).join('')}</div></section>`).join('\n');
 const gallery=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Solar Year — visual history</title><style>body{margin:0;background:#f8f7f2;color:#293b44;font:15px/1.6 Arial,sans-serif}main{max-width:1440px;margin:auto;padding:40px 28px}h1{font:36px Georgia,serif;font-weight:400}h2{font:25px Georgia,serif;font-weight:400}.intro{max-width:700px;color:#64716c}section{border-top:1px solid #d9ddd5;margin-top:40px;padding-top:25px}.meta,figcaption{font-size:12px;color:#718078}.captures{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;margin-top:24px}figure{margin:0;min-width:0}img{display:block;width:100%;height:330px;object-fit:contain;object-position:top;background:#f2f1eb;border:1px solid #e0e2d9}figcaption{padding-top:8px}a{color:#405c54;text-underline-offset:3px}@media(max-width:800px){.captures{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:500px){.captures{grid-template-columns:1fr}}@media print{main{padding:0}section{break-before:page}a{color:inherit}}</style></head><body><main><h1>The Solar Year — visual history</h1><p class="intro">A project-only record of each design iteration. Click any image to open the full-page capture. These files are documentation; they are not part of the Solar Year website.</p>${sections}</main></body></html>`;
 await writeFile(path.join(directory,'index.html'),gallery);
 const files={};
 async function collect(folder,relative=''){
  for(const entry of await readdir(folder,{withFileTypes:true})){
   if(entry.name.startsWith('.'))continue;
   const name=relative?`${relative}/${entry.name}`:entry.name;
   if(entry.isDirectory())await collect(path.join(folder,entry.name),name);
   else if(entry.isFile())files[`Solar-Year-Visual-History/${name}`]=[new Uint8Array(await readFile(path.join(folder,entry.name))),{level:entry.name.endsWith('.png')?0:6}];
  }
 }
 await collect(directory);
 const zip=zipSync(files);
 const archive=path.join(root,'visual-history.zip');await writeFile(archive,zip);await chmod(archive,0o644);
 if(root.startsWith('/workspace/')){await writeFile('/workspace/Solar-Year-Visual-History.zip',zip);await chmod('/workspace/Solar-Year-Visual-History.zip',0o644);}
 console.log(`Visual history: ${iterations.length} iterations; ${iterations.reduce((sum,m)=>sum+m.captures.length,0)} screenshots; ZIP refreshed.`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await packageVisualHistory();
