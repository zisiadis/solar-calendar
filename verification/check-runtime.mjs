// Vite's actual bundle module graph is stronger evidence than filename matching.
import {build} from 'vite';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const forbidden=/(?:^|\/)(?:verification|references|docs|scripts)(?:\/|$)|\.test\.[cm]?[jt]sx?$|(?:^|\/)node_modules\/(?:playwright|skyfield)(?:\/|$)/;
let modules=0;
await build({root,logLevel:'error',build:{write:false},plugins:[{
 name:'assert-verification-excluded',
 generateBundle(_options,bundle){
  for(const output of Object.values(bundle)){
   assert.ok(!forbidden.test(output.fileName),`Verification asset emitted: ${output.fileName}`);
   if(output.type==='chunk')for(const id of Object.keys(output.modules)){
    const relative=id.replace(root,'');
    assert.ok(!forbidden.test(relative),`Verification module in runtime: ${relative}`);
    modules++;
   }
  }
 }
}]});
const exporter=await readFile(new URL('../scripts/export-html.mjs',import.meta.url),'utf8');
assert.ok(!/verification\//.test(exporter),'Standalone exporter refers to verification files');
console.log(`Verified ${modules} production modules: no verification code, reference tables or documentation.`);
