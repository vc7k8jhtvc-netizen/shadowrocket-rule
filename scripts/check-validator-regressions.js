// Negative fixtures verify that validators reject invalid input, not only today's valid config.
const fs=require('fs');
const os=require('os');
const path=require('path');
const {spawnSync,execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'validator-check-'));
const assert=(ok,message)=>{if(!ok)throw new Error(message);};
function check(script,args,expected,diagnostic){
  const result=spawnSync(process.execPath,[path.join(temp,'scripts',script),...args],{encoding:'utf8',timeout:10000});
  assert(result.status===expected,script+': unexpected validation result\n'+result.stdout+result.stderr);
  if(diagnostic)assert((result.stdout+result.stderr).includes(diagnostic),script+': expected rejection missing');
}
try{
  fs.mkdirSync(path.join(temp,'scripts'));
  for(const file of [
    'scripts/check-shadowrocket-routing.js','scripts/check-dual-client.js','scripts/check-clash-script.js',
    'scripts/check-westdata-local.js','scripts/check-sensitive-data.js','scripts/check-version.js',
    'Shadowrocket_Routing.conf','Clash_Verge_Rev_Script.js','Custom.list','README.md','CHANGELOG.md'
  ])fs.copyFileSync(path.join(root,file),path.join(temp,file));

  const routingPath=path.join(temp,'Shadowrocket_Routing.conf');
  const routing=fs.readFileSync(routingPath,'utf8');
  const customPath=path.join(temp,'Custom.list');
  const custom=fs.readFileSync(customPath,'utf8');

  check('check-shadowrocket-routing.js',[],0);
  check('check-dual-client.js',[],0);
  check('check-clash-script.js',[path.join(temp,'Clash_Verge_Rev_Script.js')],0);
  check('check-version.js',[],0);

  fs.writeFileSync(routingPath,routing.replace('RULE-SET,https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Custom.list,🧩 自定义\n',''));
  check('check-shadowrocket-routing.js',[],1,'Custom.list routing rule missing');
  fs.writeFileSync(routingPath,routing);

  fs.writeFileSync(customPath,custom+'DOMAIN-SUFFIX,wikipedia.org\n');
  check('check-shadowrocket-routing.js',[],1,'duplicate Custom.list entry');
  fs.writeFileSync(customPath,custom+'INVALID,example.com\n');
  check('check-shadowrocket-routing.js',[],1,'unsupported Custom.list rule syntax');
  fs.writeFileSync(customPath,custom);

  fs.writeFileSync(routingPath,routing.replace('🐟 漏网之鱼 = select,🚀 默认代理,DIRECT,','🐟 漏网之鱼 = select,🚀 默认代理,'));
  check('check-shadowrocket-routing.js',[],1,'fallback group must include DIRECT');
  fs.writeFileSync(routingPath,routing.replace('DOMAIN-WILDCARD,*,🐟 漏网之鱼\n',''));
  check('check-shadowrocket-routing.js',[],1,'explicit terminal rules');
  fs.writeFileSync(routingPath,routing);

  const readmePath=path.join(temp,'README.md');
  const readme=fs.readFileSync(readmePath,'utf8');
  fs.writeFileSync(readmePath,readme.replace('内部版本为 `v2.7.15`','内部版本为 `v9.9.9`'));
  check('check-version.js',[],1,'version mismatch');
  fs.writeFileSync(readmePath,readme);

  const changelogPath=path.join(temp,'CHANGELOG.md');
  const changelog=fs.readFileSync(changelogPath,'utf8');
  fs.writeFileSync(changelogPath,changelog.replace('内部版本升至 `v2.7.15`','内部版本升至 `v9.9.9`'));
  check('check-version.js',[],1,'version mismatch');
  fs.writeFileSync(changelogPath,changelog);

  const clashPath=path.join(temp,'Clash_Verge_Rev_Script.js');
  const clash=fs.readFileSync(clashPath,'utf8');
  fs.writeFileSync(clashPath,clash.replace("'RULE-SET,Custom,🧩 自定义',\n",''));
  check('check-dual-client.js',[],1,'Clash Custom rule missing');
  fs.writeFileSync(clashPath,clash);

  const pool='👆 手动选择 = select,';
  fs.writeFileSync(routingPath,routing.replace(pool,pool+'missing-policy,'));
  check('check-shadowrocket-routing.js',[],1,'missing policy');
  fs.writeFileSync(routingPath,routing);

  const basePath=path.join(temp,'base.conf');
  const base='[General]\nuse-local-host-item-for-proxy = true\n[Proxy]\n'+['Hong Kong','Taiwan','Singapore','Japan','United States'].map(region=>region+' | Fixture = ss,127.0.0.1,1,password=test-only').join('\n')+'\n[Host]\ncos-ap-beijing.toshiba-asdf.com = cos-ap-beijing.micron-asdf.com\noss-cn-guangzhou.toshiba-asdf.com = oss-cn-guangzhou.micron-asdf.com\noss-cn-shanghai.toshiba-asdf.com = oss-cn-shanghai.micron-asdf.com\n';
  const valid='^https?://(www.)?g.cn($|/.*) https://www.google.com$2 302\n^https?://(www.)?google.cn($|/.*) https://www.google.com$2 302';
  fs.writeFileSync(basePath,base+'[URL Rewrite]\n'+valid+'\n[MITM]\nenable = true\nhostname = *.google.cn\n');
  check('check-westdata-local.js',[basePath],0);

  execFileSync('git',['init','-q',temp]);
  const candidate=path.join(temp,'candidate.sgmodule');
  fs.writeFileSync(candidate,'[MITM]\nca-passphrase = test-only\n');
  execFileSync('git',['-C',temp,'add','candidate.sgmodule','scripts/check-sensitive-data.js']);
  check('check-sensitive-data.js',[],1,'MITM CA material');

  console.log('PASS: validator regressions reject Custom/fallback/version/group/security drift');
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
