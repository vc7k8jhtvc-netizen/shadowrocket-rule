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
const expectedOrder=['🚀 默认代理','👆 手动选择','🤖 AI','🍎 Apple','🔎 Google','💻 开发工具','🪟 Microsoft','📱 社交媒体','▶️ YouTube','✈️ Telegram','🔞 NSFW','🐟 漏网之鱼','🇭🇰 香港','🏝️ 台湾','🇸🇬 新加坡','🇯🇵 日本','🇺🇸 美国'];

const directInput={dns:{enable:false,marker:'subscription-dns'},hosts:{'subscription.example':'192.0.2.1'},ipv6:true,proxies:[
{name:'Hong Kong | HK-01',type:'ss',server:'127.0.0.1',port:8388,cipher:'aes-128-gcm',password:'test-only'},
{name:'United States | US-01',type:'ss',server:'127.0.0.1',port:8389,cipher:'aes-128-gcm',password:'test-only'},
{name:'Japan | JP-01',type:'ss',server:'127.0.0.1',port:8390,cipher:'aes-128-gcm',password:'test-only'},
{name:'🇺🇸 US-EXTRA',type:'ss',server:'127.0.0.1',port:8391,cipher:'aes-128-gcm',password:'test-only'}],rules:['MATCH,DIRECT'],'proxy-groups':[]};

const direct=context.main(JSON.parse(JSON.stringify(directInput)));
assert(JSON.stringify(direct['proxy-groups'].map(item=>item.name))===JSON.stringify(expectedOrder),'proxy group display order');
assert(!group(direct,'🛑 广告拦截'),'legacy Advertising group must be absent');
assert(group(direct,'🤖 AI').proxies[0]==='🇸🇬 新加坡','AI default');
assert(!group(direct,'🧩 自定义'),'removed Custom group must be absent');
assert(!group(direct,'💻 GitHub'),'renamed GitHub group must be absent');
assert(JSON.stringify(group(direct,'🔞 NSFW').proxies)===JSON.stringify(['🚀 默认代理','🇭🇰 香港','🏝️ 台湾','🇸🇬 新加坡','🇯🇵 日本','🇺🇸 美国','👆 手动选择']),'NSFW group options');
const fullChoiceGroups=['🤖 AI','🍎 Apple','🔎 Google','💻 开发工具','🪟 Microsoft','📱 社交媒体','▶️ YouTube','✈️ Telegram','🔞 NSFW','🐟 漏网之鱼'];
for(const name of fullChoiceGroups){
  for(const choice of ['🇭🇰 香港','🏝️ 台湾','🇸🇬 新加坡','🇯🇵 日本','🇺🇸 美国','👆 手动选择']){
    assert(group(direct,name).proxies.includes(choice),name+' missing shared routing choice: '+choice);
  }
}
assert(group(direct,'🐟 漏网之鱼').proxies[0]==='🚀 默认代理','fallback default');
assert(group(direct,'🐟 漏网之鱼').proxies.includes('DIRECT'),'fallback DIRECT');
assert(group(direct,'🐟 漏网之鱼').proxies.includes('👆 手动选择'),'fallback manual selection');
assert(direct.dns&&direct.dns.marker==='subscription-dns','must preserve subscription DNS');
assert(direct.hosts&&direct.hosts['subscription.example']==='192.0.2.1','must preserve subscription hosts');
assert(direct.ipv6===true,'must not override subscription IPv6');
assert(!Object.prototype.hasOwnProperty.call(direct,'mode'),'must not force application-managed mode');
assert(direct.profile&&direct.profile['store-selected'],'must persist selection');
assert(!direct['rule-providers'].Advertising&&!direct['rule-providers'].Advertising_Domain,'legacy Advertising providers must be absent');
assert(!direct.rules.some(rule=>/Advertising|广告拦截/.test(rule)),'legacy Advertising rules must be absent');
assert(!('Custom' in direct['rule-providers']),'removed Custom provider must be absent');
assert(direct['rule-providers'].Adult,'Adult provider missing');
assert(direct['rule-providers'].Adult.behavior==='classical','Adult provider behavior');
assert(direct['rule-providers'].Adult.format==='text','Adult provider format');
assert(direct['rule-providers'].Adult.url.endsWith('/Adult.list'),'Adult provider source');
assert(direct['rule-providers'].Adult.path==='./rule_providers/Adult.list','Adult provider path');
assert(!('OpenAI_Voice' in direct['rule-providers']),'removed OpenAI_Voice provider must be absent');
assert(!('Global' in direct['rule-providers']),'old Global provider must be absent');
assert(!direct.rules.some(rule=>rule.startsWith('RULE-SET,Global,')),'old Global rule must be absent');
assert(!direct.rules.some(rule=>rule.startsWith('RULE-SET,Custom,')),'removed Custom rule must be absent');
assert(direct.rules.includes('RULE-SET,Adult,🔞 NSFW,no-resolve'),'Adult routing rule missing');
assert(!direct.rules.some(rule=>rule.startsWith('RULE-SET,OpenAI_Voice,')),'removed OpenAI_Voice rule must be absent');
assert(direct.rules[direct.rules.length-1]==='MATCH,🐟 漏网之鱼','MATCH must route to fallback');

const googleIndex=direct.rules.indexOf('RULE-SET,Google,🔎 Google,no-resolve');
const adultIndex=direct.rules.indexOf('RULE-SET,Adult,🔞 NSFW,no-resolve');
const chinaIndex=direct.rules.indexOf('RULE-SET,China,DIRECT,no-resolve');
assert(googleIndex>0&&googleIndex<adultIndex&&adultIndex<chinaIndex,'Google/Adult/China order');

assert(group(direct,'🇺🇸 美国').proxies.includes('United States | US-01'),'US node matching');
assert(!group(direct,'👆 手动选择').proxies.includes('🇺🇸 US-EXTRA'),'all-node filter');
assert(JSON.stringify(group(direct,'🏝️ 台湾').proxies)===JSON.stringify(['REJECT']),'empty region must fail closed to REJECT');
assert(JSON.stringify(group(direct,'🇸🇬 新加坡').proxies)===JSON.stringify(['REJECT']),'empty Singapore region must fail closed to REJECT');
assert(logs.some(item=>/开始生成 Clash Verge Rev 配置 \(v\d+\.\d+\.\d+\)/.test(item.message)),'start log must include script version');
assert(logs.some(item=>item.message.includes('完成：')),'completion log');
assert(logs.some(item=>item.level==='warn'&&item.message.includes('台湾')),'fallback warning');
assert(!logs.some(item=>item.message.includes('HK-01')),'console must not expose node names');
assert(direct.rules[0]==='RULE-SET,Lan,DIRECT,no-resolve','LAN must not resolve domains before service rules');
const classicalNoResolveRules=[
  'RULE-SET,Lan,DIRECT,no-resolve',
  'RULE-SET,Apple,🍎 Apple,no-resolve',
  'RULE-SET,Microsoft,🪟 Microsoft,no-resolve',
  'RULE-SET,GitHub,💻 开发工具,no-resolve',
  'RULE-SET,Telegram,✈️ Telegram,no-resolve',
  'RULE-SET,Twitter,📱 社交媒体,no-resolve',
  'RULE-SET,Instagram,📱 社交媒体,no-resolve',
  'RULE-SET,TikTok,📱 社交媒体,no-resolve',
  'RULE-SET,YouTube,▶️ YouTube,no-resolve',
  'RULE-SET,Google,🔎 Google,no-resolve',
  'RULE-SET,Adult,🔞 NSFW,no-resolve',
  'RULE-SET,China,DIRECT,no-resolve'
];
for(const rule of classicalNoResolveRules){
  assert(direct.rules.includes(rule),'Clash classical RULE-SET must use no-resolve: '+rule);
}
assert(direct['rule-providers'].Apple_Domain.behavior==='domain','Apple domain provider');
assert(direct['rule-providers'].Apple_Domain.format==='yaml','Apple domain provider format');
assert(direct['rule-providers'].Apple_Domain.url.endsWith('/Clash/Apple/Apple_Domain.yaml'),'Apple domain rule-provider source');
assert(direct['rule-providers'].Apple_Domain.path==='./rule_providers/Apple_Domain.yaml','Apple domain rule-provider path');
assert(direct['rule-providers'].China_Domain.behavior==='domain','China domain provider');
assert(direct['rule-providers'].China_Domain.format==='yaml','China domain provider format');
assert(!group(direct,'🐟 FINAL'),'obsolete FINAL policy group must be absent');

const ruleSetNames=new Set(Object.keys(direct['rule-providers']));
for(const rule of direct.rules){
  if(!rule.startsWith('RULE-SET,'))continue;
  const name=rule.split(',')[1];
  assert(ruleSetNames.has(name),`missing rule provider: ${name}`);
}
const appleIndex=direct.rules.indexOf('RULE-SET,Apple,🍎 Apple,no-resolve');
const fallbackIndex=direct.rules.indexOf('MATCH,🐟 漏网之鱼');
const chinaDomainIndex=direct.rules.indexOf('RULE-SET,China_Domain,DIRECT');
assert(appleIndex>0&&appleIndex<googleIndex,'AI/Apple/Google order');
assert(chinaIndex<chinaDomainIndex&&chinaDomainIndex<fallbackIndex,'China/China_Domain/fallback order');
assert(direct['rule-providers'].China_Domain.url.endsWith('/Clash/China/China_Domain.yaml'),'China domain rule-provider source');
assert(direct['rule-providers'].China_Domain.path==='./rule_providers/China_Domain.yaml','China domain rule-provider path');
assert(!direct.rules.includes('GEOIP,CN,DIRECT,no-resolve'),'Clash GEOIP rule must not use no-resolve');
assert(direct.rules.includes('GEOIP,CN,DIRECT'),'GEOIP CN direct rule');

const provider=context.main({'proxy-providers':{WestData:{type:'http',url:'https://example.invalid/sub'}}});
assert(group(provider,'👆 手动选择').use.includes('WestData'),'provider support');
assert(group(provider,'👆 手动选择')['empty-fallback']==='REJECT','provider all-node fail closed');
assert(group(provider,'👆 手动选择').filter==='^.+ \\| .+$','all-node provider filter');
for(const name of ['🇭🇰 香港','🏝️ 台湾','🇸🇬 新加坡','🇯🇵 日本','🇺🇸 美国']){
  const region=group(provider,name);
  assert(region.use.includes('WestData'),name+' provider inclusion');
  assert(!region.filter.startsWith('(?i)'),name+' provider filter must remain case-sensitive');
  assert(region['empty-fallback']==='REJECT',name+' fail closed');
  assert(!region.proxies||!region.proxies.includes('👆 手动选择'),name+' provider fallback must not mask filtering');
}
// YAML empty keys deserialize as null; null proxies (with providers), listeners, and tunnels must be accepted.
const nullFields=context.main({
  proxies:null,
  'proxy-groups':null,
  'rule-providers':null,
  listeners:null,
  tunnels:null,
  'proxy-providers':{WestData:{type:'http',url:'https://example.invalid/sub'}}
});
assert(group(nullFields,'👆 手动选择').use.includes('WestData'),'null proxies with provider must be accepted');
let rejected=false;try{context.main({});}catch(error){rejected=/proxies/.test(error.message);}assert(rejected,'empty subscriptions must fail closed');
for(const name of ['HK-01','剩余流量：10GB']){
  const input={proxies:[{...directInput.proxies[0],name}],rules:['MATCH,DIRECT']};
  const before=JSON.stringify(input);
  let rejectedSubscription=false;
  try{context.main(input);}catch(error){rejectedSubscription=/WestData/.test(error.message);}
  assert(rejectedSubscription,'subscriptions with no matching static nodes must be rejected');
  assert(JSON.stringify(input)===before,'rejected subscription must not be partially rewritten');
}
const mixed=context.main({proxies:[{...directInput.proxies[0],name:'HK-01'}],'proxy-providers':{WestData:{type:'http',url:'https://example.invalid/sub'}}});
assert(group(mixed,'👆 手动选择').use.includes('WestData'),'unmatched static nodes must not reject a provider subscription');
assert(group(mixed,'👆 手动选择')['empty-fallback']==='REJECT','mixed subscription must fail closed');

const dependencyInput={
  proxies:[{...directInput.proxies[0],'dialer-proxy':'🚀 默认代理'}],
  'proxy-groups':[
    {name:'🚀 默认代理',type:'select',proxies:['Transport']},
    {name:'Transport',type:'select',proxies:['DIRECT'],'dialer-proxy':'RelayExit','empty-fallback':'RelayExit'},
    {name:'RelayExit',type:'select',proxies:['DIRECT']},
    {name:'DnsExit',type:'select',proxies:['DIRECT']},
    {name:'Unused',type:'select',proxies:['REJECT']}
  ],
  'proxy-providers':{WestData:{type:'inline',payload:[{...directInput.proxies[1],'dialer-proxy':'Transport'}],proxy:'Transport',override:{'dialer-proxy':'Transport'}}},
  dns:{
    enable:true,
    nameserver:['1.1.1.1','https://dns.google/dns-query#DnsExit&h3=true','https://1.1.1.1/dns-query#h3=true'],
    fallback:['tls://8.8.8.8#🚀 默认代理'],
    'nameserver-policy':{
      'rule-set:China,SubscriptionDomain':['1.1.1.1','https://dns.google/dns-query#Transport'],
      'example.com,rule-set:MixedDomain':'https://dns.google/dns-query#DnsExit',
      'geosite:cn,rule-set:MixedDomain':['223.5.5.5'],
      'rule-set:SubscriptionDomain,example.org':['1.1.1.1'],
      'geosite:cn,netflix':['223.5.5.5']
    },
    'fake-ip-filter':['rule-set:SubscriptionDomain','rule-set:WinBackslash','rule-set:CaseClash']
  },
  'rule-providers':{
    China:{type:'inline',behavior:'domain',payload:['+.fixture.invalid'],path:'./rule_providers/China.yaml'},
    SubscriptionDomain:{type:'inline',behavior:'domain',payload:['+.subscription.invalid'],proxy:'Transport'},
    MixedDomain:{type:'inline',behavior:'domain',payload:['+.mixed.invalid']},
    WinBackslash:{type:'inline',behavior:'domain',payload:['+.win.invalid'],path:'.\\rule_providers\\China.yaml'},
    CaseClash:{type:'inline',behavior:'domain',payload:['+.case.invalid'],path:'./rule_providers/china.yaml'},
    Unused:{type:'inline',behavior:'domain',payload:['+.unused.invalid']}
  }
};
const dependencies=context.main(JSON.parse(JSON.stringify(dependencyInput)));
const dialerGroup=group(dependencies,dependencies.proxies[0]['dialer-proxy']);
assert(dialerGroup&&dialerGroup.name!=='🚀 默认代理','original colliding dialer group must be retained separately');
const transportGroup=group(dependencies,dialerGroup.proxies[0]);
assert(JSON.stringify(transportGroup.proxies)==='["DIRECT"]','transitive dialer group dependency must retain its exit');
const relayGroup=group(dependencies,transportGroup['dialer-proxy']);
assert(relayGroup&&relayGroup.name.startsWith('__subscription_group_'),'retained group dialer-proxy dependency must be preserved');
assert(transportGroup['empty-fallback']===relayGroup.name,'retained group empty-fallback dependency must be preserved');
assert(!group(dependencies,'Unused'),'unreferenced subscription groups must be discarded');
assert(dependencies['proxy-providers'].WestData.proxy===transportGroup.name,'provider download policy dependency');
assert(dependencies['proxy-providers'].WestData.override['dialer-proxy']===transportGroup.name,'provider override dialer dependency');
assert(dependencies['proxy-providers'].WestData.payload[0]['dialer-proxy']===transportGroup.name,'inline provider node dialer dependency');
const dnsExitServer=dependencies.dns.nameserver[1];
const dnsExitMatch=dnsExitServer.match(/^https:\/\/dns\.google\/dns-query#([^&]+)&h3=true$/);
assert(dnsExitMatch&&group(dependencies,dnsExitMatch[1]),'DNS server #proxy group dependency must be preserved');
assert(dependencies.dns.nameserver[2]==='https://1.1.1.1/dns-query#h3=true','DNS server params without proxy must remain untouched');
assert(dependencies.dns.fallback[0]==='tls://8.8.8.8#'+dialerGroup.name,'DNS fallback colliding #proxy group must map to retained group');
const policyEntries=Object.entries(dependencies.dns['nameserver-policy']);
const dnsKey=policyEntries[0][0];
const dnsSets=dnsKey.slice('rule-set:'.length).split(',');
assert(dnsSets.length===2&&dnsSets[0]!=='China','colliding DNS rule-provider must be retained separately');
assert(dependencies['rule-providers'][dnsSets[0]].path!=='./rule_providers/China.yaml','colliding retained rule-provider path must be isolated');
assert(JSON.stringify(dependencies['rule-providers'][dnsSets[0]].payload)==='["+.fixture.invalid"]','DNS rule-provider payload must be preserved');
assert(dependencies['rule-providers'][dnsSets[1]].proxy===transportGroup.name,'DNS rule-provider download dependency');
assert(policyEntries[0][1][1]==='https://dns.google/dns-query#'+transportGroup.name,'nameserver-policy server #proxy dependency');
const mixedParts=policyEntries[1][0].split(',');
assert(mixedParts[0]==='example.com'&&mixedParts[1].startsWith('rule-set:__subscription_rule_'),'mixed nameserver-policy rule-set key must be preserved');
assert(policyEntries[1][1]==='https://dns.google/dns-query#'+dnsExitMatch[1],'string nameserver-policy server #proxy dependency');
const geositeMixedParts=policyEntries[2][0].split(',');
assert(geositeMixedParts[0]==='geosite:cn'&&geositeMixedParts[1].startsWith('rule-set:__subscription_rule_'),'geosite+rule-set mixed nameserver-policy key must be preserved');
const ruleSetDomainParts=policyEntries[3][0].split(',');
assert(ruleSetDomainParts[0].startsWith('rule-set:__subscription_rule_')&&ruleSetDomainParts[1]==='example.org','rule-set+domain mixed nameserver-policy key must be preserved');
assert(policyEntries[4][0]==='geosite:cn,netflix','geosite nameserver-policy key must remain unchanged');
assert(dependencies.dns['fake-ip-filter'][0]==='rule-set:'+dnsSets[1],'fake-ip-filter must reference retained DNS rule-provider');
const winRetainedName=dependencies.dns['fake-ip-filter'][1].slice('rule-set:'.length);
const caseRetainedName=dependencies.dns['fake-ip-filter'][2].slice('rule-set:'.length);
const normalizedAllPaths=Object.values(dependencies['rule-providers']).map(p=>p.path).filter(Boolean).map(p=>p.replace(/\\/g,'/').replace(/\/+/g,'/').replace(/^(?:\.\/)+/,'').toLowerCase());
assert(new Set(normalizedAllPaths).size===normalizedAllPaths.length,'Windows backslash and case-insensitive rule-provider paths must never collide');
assert(dependencies['rule-providers'][winRetainedName].path!=='.\\rule_providers\\China.yaml','backslash colliding path must be isolated');
assert(dependencies['rule-providers'][caseRetainedName].path!=='./rule_providers/china.yaml','case-colliding path must be isolated');
assert(!dependencies['rule-providers'].Unused,'unreferenced subscription rule-providers must be discarded');
assert(group(dependencies,'🚀 默认代理').proxies[0]==='🇭🇰 香港','dependency preservation must keep routing default');
assert(dependencies['rule-providers'].China.url.endsWith('/Clash/China/China.yaml'),'dependency preservation must keep routing provider');

// M3: fake-ip-filter-mode: rule (RULE-SET,<name>,fake-ip|real-ip) and ntp.dialer-proxy retention.
const ruleModeInput={
  proxies:[directInput.proxies[0]],
  'proxy-groups':[{name:'NtpExit',type:'select',proxies:['DIRECT']}],
  ntp:{enable:true,server:'time.apple.com',port:123,'dialer-proxy':'NtpExit'},
  dns:{
    enable:true,
    'enhanced-mode':'fake-ip',
    'fake-ip-filter-mode':'rule',
    'fake-ip-filter':['RULE-SET,RuleModeDomain,real-ip','DOMAIN-SUFFIX,example.invalid,fake-ip','MATCH,fake-ip']
  },
  'rule-providers':{
    RuleModeDomain:{type:'inline',behavior:'domain',payload:['+.rulemode.invalid']},
    UnusedRuleMode:{type:'inline',behavior:'domain',payload:['+.unused.invalid']}
  }
};
const ruleMode=context.main(JSON.parse(JSON.stringify(ruleModeInput)));
const ruleModeEntry=ruleMode.dns['fake-ip-filter'][0];
const ruleModeParts=ruleModeEntry.split(',');
assert(ruleModeParts[0]==='RULE-SET'&&ruleModeParts[1].startsWith('__subscription_rule_')&&ruleModeParts[2]==='real-ip','rule-mode fake-ip-filter RULE-SET must map to retained rule-provider');
assert(ruleMode['rule-providers'][ruleModeParts[1]]&&!ruleMode['rule-providers'].UnusedRuleMode,'only referenced rule-mode fake-ip-filter provider must be retained');
assert(ruleMode.dns['fake-ip-filter'][1]==='DOMAIN-SUFFIX,example.invalid,fake-ip','non RULE-SET fake-ip-filter rule must stay untouched');
assert(ruleMode.ntp&&ruleMode.ntp['dialer-proxy'].startsWith('__subscription_group_')&&group(ruleMode,ruleMode.ntp['dialer-proxy']),'ntp.dialer-proxy must map to retained group');
const ntpNull=context.main({proxies:[directInput.proxies[0]],ntp:null});
assert(ntpNull.ntp===null,'null ntp YAML key must be accepted');

for(const invalid of [
  {...dependencyInput,'proxy-groups':[{name:'🚀 默认代理',type:'select',proxies:['🚀 默认代理']}]},
  {...dependencyInput,'rule-providers':{}},
  {...dependencyInput,dns:{enable:true,nameserver:['https://dns.google/dns-query#MissingPolicy']}},
  {...dependencyInput,'proxy-groups':[null]},
  {proxies:[{...directInput.proxies[0]},null]},
  {proxies:[directInput.proxies[0]],'proxy-providers':[]},
  {proxies:[directInput.proxies[0]],'rule-providers':[]},
  {proxies:[directInput.proxies[0]],listeners:'invalid'},
  {proxies:[directInput.proxies[0]],tunnels:'invalid'},
  {proxies:[directInput.proxies[0]],ntp:[]},
  {proxies:[directInput.proxies[0]],ntp:{enable:true,'dialer-proxy':'MissingPolicy'}},
  {proxies:[directInput.proxies[0]],dns:{enable:true,'fake-ip-filter-mode':'rule','fake-ip-filter':['RULE-SET,MissingRuleSet,real-ip']}}
]){
  const input=JSON.parse(JSON.stringify(invalid)),before=JSON.stringify(input);
  let failed=false;try{context.main(input);}catch(error){failed=/订阅/.test(error.message);}
  assert(failed,'invalid subscription dependencies must be rejected');
  assert(JSON.stringify(input)===before,'dependency rejection must not partially mutate input');
}
if(process.env.MIHOMO_CONFIG_OUTPUT)fs.writeFileSync(process.env.MIHOMO_CONFIG_OUTPUT,JSON.stringify(direct,null,2));
console.log('PASS: Clash Verge Rev Adult and dependency checks (no Advertising)');
