import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { rolldown } from 'rolldown';
const pkg=JSON.parse(await readFile('package.json','utf8'));
await mkdir('dist',{recursive:true});
const bundle=await rolldown({input:'src/index.ts',platform:'node'});
await bundle.write({file:'dist/plugin.mjs',format:'esm'});
await bundle.close();
const module=await import('../dist/plugin.mjs?verify='+Date.now());
const instance=module.createPlugin({});
if(instance.id!==pkg.approvalPlugin.id||instance.version!==pkg.version)throw Error('Plugin metadata mismatch');
const sha256=createHash('sha256').update(await readFile('dist/plugin.mjs')).digest('hex');
await writeFile('plugin.json',JSON.stringify({apiVersion:1,id:instance.id,name:pkg.approvalPlugin.name,description:pkg.description,version:instance.version,normalizationVersion:instance.normalizationVersion,entry:'plugin.mjs',sha256},null,2)+'\n');

