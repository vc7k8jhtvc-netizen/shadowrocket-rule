const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname,'..');
const shadowrocket = fs.readFileSync(path.join(root,'Shadowrocket_Routing.conf'),'utf8');
const clashSource = fs.readFileSync(path.join(root,'Clash_Verge_Rev_Script.js'),'utf8');
const assert = (condition,message) => { if (!condition) throw new Error(message); };
function section(text,name) {
  const escaped=name.replace(/[.*+?^$()|[\]\\]/g,'\\$&');
  const match=text.match(new RegExp('\\['+escaped+'\\]\\s*\\n([\\s\\S]*?)(?=\\n\\[[^\\]]+\\]|$)'));
  assert(match,'missing ['+name+'] section');
  return match[1];
}
function activeLines(text){return text.split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#'));}

const shadowGroups=new Map(),shadowFilters=new Map();
for(const line of activeLines(section(shadowrocket,'Proxy Group'))){
  const eq=line.indexOf('='),name=line.slice(0,eq).trim(),parts=line.slice(eq+1).split(',').map(x=>x.trim());
  shadowGroups.set(name,parts.slice(1).filter(x=>!x.startsWith('policy-regex-filter=')&&!x.startsWith('select=')));
  const filter=parts.find(x=>x.startsWith('policy-regex-filter='));
  if(filter)shadowFilters.set(name,filter.slice('policy-regex-filter='.length));
}

const context={console:{log(){},warn(){},error(){}}};
vm.createContext(context);vm.runInContext(clashSource,context);
const clash=context.main({proxies:[
{name:'Hong Kong | HK-01',type:'ss',server:'127.0.0.1',port:1,cipher:'aes-128-gcm',password:'test-only'},
{name:'Taiwan | TW-01',type:'ss',server:'127.0.0.1',port:2,cipher:'aes-128-gcm',password:'test-only'},
{name:'Singapore | SG-01',type:'ss',server:'127.0.0.1',port:3,cipher:'aes-128-gcm',password:'test-only'},
{name:'Japan | JP-01',type:'ss',server:'127.0.0.1',port:4,cipher:'aes-128-gcm',password:'test-only'},
{name:'United States | US-01',type:'ss',server:'127.0.0.1',port:5,cipher:'aes-128-gcm',password:'test-only'}
]});
const clashGroups=new Map(clash['proxy-groups'].map(g=>[g.name,g]));

const expectedOrder=['🚀 默认代理','👆 手动选择','🤖 AI','🍎 Apple','🔎 Google','💻 GitHub','🪟 Microsoft','📱 社交媒体','▶️ YouTube','✈️ Telegram','🧩 自定义','🛑 广告拦截','🐟 漏网之鱼','🇭🇰 香港','🏝️ 台湾','🇸🇬 新加坡','🇯🇵 日本','🇺🇸 美国'];
assert(JSON.stringify([...shadowGroups.keys()])===JSON.stringify(expectedOrder),'Shadowrocket display order drift');
assert(JSON.stringify([...clashGroups.keys()])===JSON.stringify(expectedOrder),'Clash display order drift');

const parityGroups=['🚀 默认代理','🤖 AI','🍎 Apple','🔎 Google','💻 GitHub','🪟 Microsoft','📱 社交媒体','▶️ YouTube','✈️ Telegram','🧩 自定义','🛑 广告拦截','🐟 漏网之鱼'];
for(const name of parityGroups){
  assert(shadowGroups.has(name),'Shadowrocket missing parity group: '+name);
  assert(clashGroups.has(name),'Clash missing parity group: '+name);
  assert(JSON.stringify(shadowGroups.get(name))===JSON.stringify(clashGroups.get(name).proxies||[]),'proxy group drift between clients: '+name);
}

assert(clash['rule-providers'].Custom,'Clash Custom rule-provider missing');
assert(clash['rule-providers'].Custom.url.endsWith('/Custom.list'),'Clash Custom provider URL drift');
assert(clash['rule-providers'].Custom.path==='./rule_providers/Custom.list','Clash Custom provider path drift');
assert(!clash['rule-providers'].Global,'old Clash Global rule-provider must not return');

const nodeGroups=['👆 手动选择','🇭🇰 香港','🏝️ 台湾','🇸🇬 新加坡','🇯🇵 日本','🇺🇸 美国'];
const provider=context.main({'proxy-providers':{WestData:{type:'http',url:'https://example.invalid/sub'}}});
const providerGroups=new Map(provider['proxy-groups'].map(g=>[g.name,g]));
for(const name of nodeGroups){
  assert(shadowFilters.has(name),'Shadowrocket missing node filter: '+name);
  assert(providerGroups.has(name),'Clash missing node group: '+name);
  assert(shadowFilters.get(name)===providerGroups.get(name).filter,'node filter drift between clients: '+name);
}

const shadowRules=activeLines(section(shadowrocket,'Rule'));
const shadowAi=shadowRules.filter(r=>r.endsWith(',🤖 AI'));
const clashAi=clash.rules.filter(r=>r.endsWith(',🤖 AI'));
assert(JSON.stringify(shadowAi)===JSON.stringify(clashAi),'AI manual rules drift between clients');

for(const rule of ['DOMAIN-SUFFIX,deepseek.com,DIRECT','DOMAIN-SUFFIX,bytedance.com,DIRECT','DOMAIN-SUFFIX,bytedance.net,DIRECT']){
  assert(shadowRules.includes(rule),'Shadowrocket missing direct rule: '+rule);
  assert(clash.rules.includes(rule),'Clash missing direct rule: '+rule);
}

const shadowCustom='RULE-SET,https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Custom.list,🧩 自定义';
const clashCustom='RULE-SET,Custom,🧩 自定义';
assert(shadowRules.includes(shadowCustom),'Shadowrocket Custom rule missing');
assert(clash.rules.includes(clashCustom),'Clash Custom rule missing');
assert(!shadowrocket.includes('/Global.list'),'Shadowrocket old Global.list reference must be absent');
assert(!clashSource.includes('/Global.list'),'Clash old Global.list reference must be absent');

const canonicalShadow=['Advertising/Advertising.list','Google/Google.list',shadowCustom,'/China/China.list','China_Domain.list','GEOIP,CN,DIRECT','DOMAIN-WILDCARD,*,🐟 漏网之鱼','IP-CIDR,0.0.0.0/0,🐟 漏网之鱼,no-resolve','IP-CIDR,::/0,🐟 漏网之鱼,no-resolve'];
const canonicalClash=['RULE-SET,Advertising,','RULE-SET,Google,',clashCustom,'RULE-SET,China,','RULE-SET,China_Domain,','GEOIP,CN,DIRECT','MATCH,🐟 漏网之鱼'];
function assertOrdered(rules,markers,label){
  let previous=-1;
  for(const marker of markers){
    const index=rules.findIndex((rule,i)=>i>previous&&rule.includes(marker));
    assert(index!==-1,label+' missing order marker: '+marker);
    previous=index;
  }
}
assertOrdered(shadowRules,canonicalShadow,'Shadowrocket');
assertOrdered(clash.rules,canonicalClash,'Clash');
console.log('PASS: Shadowrocket and Clash Custom/parity checks');
