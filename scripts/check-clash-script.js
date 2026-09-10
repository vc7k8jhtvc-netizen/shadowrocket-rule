const fs=require('fs');
const vm=require('vm');
const scriptPath=process.argv[2];if(!scriptPath)throw new Error('usage: node check-clash-script.js <script>');
const source=fs.readFileSync(scriptPath,'utf8');
const logs=[];
const context={console:{log:m=>logs.push({level:'log',message:m}),warn:m=>logs.push({level:'warn',message:m}),error:m=>logs.push({level:'error',message:m})}};
vm.createContext(context);vm.runInContext(source,context,{filename:scriptPath});
if(typeof context.main!=='function')throw new Error('main(config) is missing');
const assert=(c,m)=>{if(!c)throw new Error(m);};
const group=(config,name)=>config['proxy-groups'].find(item=>item.name===name);
const expectedOrder=['🚀 默认代理','👆 手动选择','🤖 AI','🍎 Apple','🔎 Google','💻 GitHub','🪟 Microsoft','📱 社交媒体','▶️ YouTube','✈️ Telegram','🧩 自定义','🛑 广告拦截','🐟 漏网之鱼','🇭🇰 香港','🏝️ 台湾','🇸🇬 新加坡','🇯🇵 日本','🇺🇸 美国'];

const directInput={dns:{enable:false,marker:'subscription-dns'},hosts:{'subscription.example':'192.0.2.1'},ipv6:true,proxies:[
{name:'Hong Kong | HK-01',type:'ss',server:'127.0.0.1',port:8388,cipher:'aes-128-gcm',password:'test-only'},
{name:'United States | US-01',type:'ss',server:'127.0.0.1',port:8389,cipher:'aes-128-gcm',password:'test-only'},
{name:'Japan | JP-01',type:'ss',server:'127.0.0.1',port:8390,cipher:'aes-128-gcm',password:'test-only'},
{name:'🇺🇸 US-EXTRA',type:'ss',server:'127.0.0.1',port:8391,cipher:'aes-128-gcm',password:'test-only'}],rules:['MATCH,DIRECT'],'proxy-groups':[]};

const direct=context.main(JSON.parse(JSON.stringify(directInput)));
assert(JSON.stringify(direct['proxy-groups'].map(item=>item.name))===JSON.stringify(expectedOrder),'proxy group display order');
assert(group(direct,'🤖 AI').proxies[0]==='🇸🇬 新加坡','AI default');
assert(JSON.stringify(group(direct,'🧩 自定义').proxies)===JSON.stringify(['🚀 默认代理','🇺🇸 美国','🇯🇵 日本','🇸🇬 新加坡']),'Custom group options');
assert(group(direct,'🐟 漏网之鱼').proxies[0]==='🚀 默认代理','fallback default');
assert(group(direct,'🐟 漏网之鱼').proxies.includes('DIRECT'),'fallback DIRECT');
assert(group(direct,'🐟 漏网之鱼').proxies.includes('👆 手动选择'),'fallback manual selection');
assert(direct.dns&&direct.dns.marker==='subscription-dns','must preserve subscription DNS');
assert(direct.hosts&&direct.hosts['subscription.example']==='192.0.2.1','must preserve subscription hosts');
assert(direct.ipv6===true,'must not override subscription IPv6');
assert(direct.mode==='rule','must set rule mode');
assert(direct.profile&&direct.profile['store-selected'],'must persist selection');
assert(group(direct,'🛑 广告拦截').proxies[0]==='REJECT','Advertising default');
assert(direct['rule-providers'].Custom,'Custom provider missing');
assert(direct['rule-providers'].Custom.behavior==='classical','Custom provider behavior');
assert(direct['rule-providers'].Custom.format==='text','Custom provider format');
assert(direct['rule-providers'].Custom.url.endsWith('/Custom.list'),'Custom provider source');
assert(direct['rule-providers'].Custom.path==='./rule_providers/Custom.list','Custom provider path');
assert(!('Global' in direct['rule-providers']),'old Global provider must be absent');
assert(!direct.rules.some(rule=>rule.startsWith('RULE-SET,Global,')),'old Global rule must be absent');
assert(direct.rules.includes('RULE-SET,Custom,🧩 自定义'),'Custom routing rule missing');
assert(direct.rules[direct.rules.length-1]==='MATCH,🐟 漏网之鱼','MATCH must route to fallback');

const googleIndex=direct.rules.indexOf('RULE-SET,Google,🔎 Google');
const customIndex=direct.rules.indexOf('RULE-SET,Custom,🧩 自定义');
const chinaIndex=direct.rules.indexOf('RULE-SET,China,DIRECT');
assert(googleIndex<customIndex&&customIndex<chinaIndex,'Google/Custom/China order');

assert(group(direct,'🇺🇸 美国').proxies.includes('United States | US-01'),'US node matching');
assert(!group(direct,'👆 手动选择').proxies.includes('🇺🇸 US-EXTRA'),'all-node filter');
assert(JSON.stringify(group(direct,'🏝️ 台湾').proxies)===JSON.stringify(['👆 手动选择']),'empty region fallback');
assert(logs.some(item=>item.message.includes('开始生成')),'start log');
assert(logs.some(item=>item.message.includes('完成：')),'completion log');

const provider=context.main({'proxy-providers':{WestData:{type:'http',url:'https://example.invalid/sub'}}});
assert(group(provider,'👆 手动选择').use.includes('WestData'),'provider support');
assert(group(provider,'👆 手动选择')['empty-fallback']==='REJECT','provider all-node fail closed');
for(const name of ['🇭🇰 香港','🏝️ 台湾','🇸🇬 新加坡','🇯🇵 日本','🇺🇸 美国']){
  const region=group(provider,name);
  assert(region.use.includes('WestData'),name+' provider inclusion');
  assert(region['empty-fallback']==='REJECT',name+' fail closed');
}
let rejected=false;try{context.main({});}catch(error){rejected=/proxies/.test(error.message);}assert(rejected,'empty subscriptions must fail closed');
console.log('PASS: Clash Verge Rev Custom routing checks');
