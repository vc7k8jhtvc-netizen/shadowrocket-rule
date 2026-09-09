const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const sr=fs.readFileSync(path.join(root,'Shadowrocket_Routing.conf'),'utf8');
const clashSource=fs.readFileSync(path.join(root,'Clash_Verge_Rev_Script.js'),'utf8');
const assert=(c,m)=>{if(!c)throw new Error(m);};
function section(text,name){const e=name.replace(/[.*+?^$()|[\]\\]/g,'\\$&');const m=text.match(new RegExp('\\['+e+'\\]\\s*\\n([\\s\\S]*?)(?=\\n\\[[^\\]]+\\]|$)'));assert(m,'missing section '+name);return m[1];}
function lines(text){return text.split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#'));}

const context={console:{log(){},warn(){},error(){}}};vm.createContext(context);vm.runInContext(clashSource,context);
const clash=context.main({proxies:[
{name:'Hong Kong | HK-01',type:'ss',server:'127.0.0.1',port:1,cipher:'aes-128-gcm',password:'test-only'},
{name:'Taiwan | TW-01',type:'ss',server:'127.0.0.1',port:2,cipher:'aes-128-gcm',password:'test-only'},
{name:'Singapore | SG-01',type:'ss',server:'127.0.0.1',port:3,cipher:'aes-128-gcm',password:'test-only'},
{name:'Japan | JP-01',type:'ss',server:'127.0.0.1',port:4,cipher:'aes-128-gcm',password:'test-only'},
{name:'United States | US-01',type:'ss',server:'127.0.0.1',port:5,cipher:'aes-128-gcm',password:'test-only'}]});

const srRules=lines(section(sr,'Rule'));
const deepseek='DOMAIN-SUFFIX,deepseek.com,DIRECT';
assert(srRules.includes(deepseek),'Shadowrocket missing DeepSeek DIRECT');
assert(clash.rules.includes(deepseek),'Clash missing DeepSeek DIRECT');
assert(srRules.indexOf(deepseek)<srRules.indexOf('DOMAIN-SUFFIX,chatgpt.com,🤖 AI'),'Shadowrocket DeepSeek rule order');
assert(clash.rules.indexOf(deepseek)<clash.rules.indexOf('DOMAIN-SUFFIX,chatgpt.com,🤖 AI'),'Clash DeepSeek rule order');
assert(clash.rules[clash.rules.length-1]==='MATCH,🌍 国际兜底','Clash fallback drift');
console.log('PASS: Shadowrocket and Clash DeepSeek parity checks');
