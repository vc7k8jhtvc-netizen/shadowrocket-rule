// Negative fixtures verify that validators reject invalid input, not only today's valid config.
const fs=require('fs'),os=require('os'),path=require('path');
const {spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'validator-check-'));
const assert=(c,m)=>{if(!c)throw new Error(m);};
function check(script,args,expected,diagnostic){const r=spawnSync(process.execPath,[path.join(temp,'scripts',script),...args],{encoding:'utf8',timeout:10000});assert(r.status===expected,script+': unexpected validation result');if(diagnostic)assert((r.stdout+r.stderr).includes(diagnostic),script+': expected rejection missing');}
try{
 fs.mkdirSync(path.join(temp,'scripts'));
 for(const f of ['scripts/check-shadowrocket-routing.js','scripts/check-dual-client.js','scripts/check-version.js','Shadowrocket_Routing.conf','Clash_Verge_Rev_Script.js','README.md','CHANGELOG.md'])fs.copyFileSync(path.join(root,f),path.join(temp,f));
 check('check-shadowrocket-routing.js',[],0);
 check('check-dual-client.js',[],0);
 check('check-version.js',[],0);
 const routingPath=path.join(temp,'Shadowrocket_Routing.conf');const routing=fs.readFileSync(routingPath,'utf8');
 fs.writeFileSync(routingPath,routing.replace('DOMAIN-WILDCARD,*,🌍 国际兜底\n',''));check('check-shadowrocket-routing.js',[],1,'explicit terminal rules');
 fs.writeFileSync(routingPath,routing.replace('IP-CIDR,0.0.0.0/0,🌍 国际兜底,no-resolve','FINAL,🌍 国际兜底'));check('check-shadowrocket-routing.js',[],1,'FINAL must not be used');
 fs.writeFileSync(routingPath,routing);
 const readmePath=path.join(temp,'README.md'),readme=fs.readFileSync(readmePath,'utf8');fs.writeFileSync(readmePath,readme.replace('内部版本为 `v2.7.9`','内部版本为 `v9.9.9`'));check('check-version.js',[],1,'version mismatch');fs.writeFileSync(readmePath,readme);
 const changelogPath=path.join(temp,'CHANGELOG.md'),changelog=fs.readFileSync(changelogPath,'utf8');fs.writeFileSync(changelogPath,changelog.replace('内部版本升至 `v2.7.9`','内部版本升至 `v9.9.9`'));check('check-version.js',[],1,'version mismatch');
 console.log('PASS: validator regressions reject missing terminal rules and version drift');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
