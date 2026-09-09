const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const sr=fs.readFileSync(path.join(root,'Shadowrocket_Routing.conf'),'utf8');
const clashSource=fs.readFileSync(path.join(root,'Clash_Verge_Rev_Script.js'),'utf8');
const assert=(c,m)=>{if(!c)throw new Error(m);};
function section(text,name){const e=name.replace(/[.*+?^$()|[\]\\]/g,'\\$&');const m=text.match(new RegExp('\\['+e+'\\]\\s*\\n([\\s\\S]*?)(?=\\n\\[[^\\]]+\\]|$)'));assert(m,'missing section '+name);return m[1];}
function lines(text){return text.split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#'));}
const srGroups=new Map();
for(const line of lines(section(sr,'Proxy Group'))){const i=line.indexOf('=');const name=line.slice(0,i).trim();const parts=line.slice(i+1).split(',').map(x=>x.trim());srGroups.set(name,parts.slice(1).filter(x=>!x.startsWith('policy-regex-filter=')&&!x.startsWith('select=')));}
const context={console:{log(){},warn(){},error(){}}};vm.createContext(context);vm.runInContext(clashSource,context);
const clash=context.main({proxies:[
{name:'Hong Kong | HK-01',type:'ss',server:'127.0.0.1',port:1,cipher:'aes-128-gcm',password:'test-only'},
{name:'Taiwan | TW-01',type:'ss',server:'127.0.0.1',port:2,cipher:'aes-128-gcm',password:'test-only'},
{name:'Singapore | SG-01',type:'ss',server:'127.0.0.1',port:3,cipher:'aes-128-gcm',password:'test-only'},
{name:'Japan | JP-01',type:'ss',server:'127.0.0.1',port:4,cipher:'aes-128-gcm',password:'test-only'},
{name:'United States | US-01',type:'ss',server:'127.0.0.1',port:5,cipher:'aes-128-gcm',password:'test-only'}]});
const clashGroups=new Map(clash['proxy-groups'].map(g=>[g.name,g]));
const expectedOrder=['🚀 默认代理','🌍 国际兜底','👆 手动选择','🤖 AI','🍎 Apple','🔎 Google','💻 GitHub','🪟 Microsoft','📱 社交媒体','▶️ YouTube','✈️ Telegram','🛑 广告拦截','🇭🇰 香港','🏝️ 台湾','🇸🇬 新加坡','🇯🇵 日本','🇺🇸 美国'];
assert(JSON.stringify([...srGroups.keys()])===JSON.stringify(expectedOrder),'Shadowrocket display order drift');
assert(JSON.stringify([...clashGroups.keys()])===JSON.stringify(expectedOrder),'Clash display order drift');
for(const name of ['🚀 默认代理','🌍 国际兜底','🤖 AI','🍎 Apple','🔎 Google','💻 GitHub','🪟 Microsoft','📱 社交媒体','▶️ YouTube','✈️ Telegram','🛑 广告拦截']){
  assert(JSON.stringify(srGroups.get(name))===JSON.stringify(clashGroups.get(name).proxies||[]),'group drift: '+name);
}
const srRules=lines(section(sr,'Rule'));
assert(!srRules.some(r=>r.startsWith('FINAL,')),'Shadowrocket must use explicit terminal rules');
assert(JSON.stringify(srRules.slice(-3))===JSON.stringify([
'DOMAIN-WILDCARD,*,🌍 国际兜底',
'IP-CIDR,0.0.0.0/0,🌍 国际兜底,no-resolve',
'IP-CIDR,::/0,🌍 国际兜底,no-resolve'
]),'Shadowrocket terminal rules drift');
assert(clash.rules[clash.rules.length-1]==='MATCH,🌍 国际兜底','Clash MATCH fallback drift');
console.log('PASS: Shadowrocket and Clash parity checks');
