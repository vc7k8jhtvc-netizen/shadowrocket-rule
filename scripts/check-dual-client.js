const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const shadowrocketPath = path.join(root, 'Shadowrocket_Routing.conf');
const clashPath = path.join(root, 'Clash_Verge_Rev_Script.js');
const shadowrocket = fs.readFileSync(shadowrocketPath, 'utf8');
const clashSource = fs.readFileSync(clashPath, 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
function section(text, name) { const escaped = name.replace(/[.*+?^$()|[\]\\]/g, '\\$&'); const match = text.match(new RegExp('\\[' + escaped + '\\]\\s*\\n([\\s\\S]*?)(?=\\n\\[[^\\]]+\\]|$)')); assert(match, 'missing [' + name + '] section'); return match[1]; }
function activeLines(text) { return text.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#')); }
const shadowGroups = new Map(), shadowFilters = new Map();
for (const line of activeLines(section(shadowrocket, 'Proxy Group'))) { const eq = line.indexOf('='); const name = line.slice(0, eq).trim(); const parts = line.slice(eq + 1).split(',').map(item => item.trim()); const options = parts.slice(1).filter(item => !item.startsWith('policy-regex-filter=') && !item.startsWith('select=')); shadowGroups.set(name, options); const filter = parts.find(item => item.startsWith('policy-regex-filter=')); if (filter) shadowFilters.set(name, filter.slice('policy-regex-filter='.length)); }
const context = { console: { log() {}, warn() {}, error() {} } }; vm.createContext(context); vm.runInContext(clashSource, context, { filename: clashPath }); assert(typeof context.main === 'function', 'Clash main(config) is missing');
const clash = context.main({ proxies: [
  { name:'Hong Kong | HK-01',type:'ss',server:'127.0.0.1',port:8388,cipher:'aes-128-gcm',password:'test-only' },
  { name:'Taiwan | TW-01',type:'ss',server:'127.0.0.1',port:8389,cipher:'aes-128-gcm',password:'test-only' },
  { name:'Singapore | SG-01',type:'ss',server:'127.0.0.1',port:8390,cipher:'aes-128-gcm',password:'test-only' },
  { name:'Japan | JP-01',type:'ss',server:'127.0.0.1',port:8391,cipher:'aes-128-gcm',password:'test-only' },
  { name:'United States | US-01',type:'ss',server:'127.0.0.1',port:8392,cipher:'aes-128-gcm',password:'test-only' }
]});
const clashGroups = new Map(clash['proxy-groups'].map(group => [group.name, group]));
const expectedOrder = ['🚀 默认代理','🌍 国际兜底','👆 手动选择','🤖 AI','🍎 Apple','🔎 Google','💻 GitHub','🪟 Microsoft','📱 社交媒体','▶️ YouTube','✈️ Telegram','🛑 广告拦截','🇭🇰 香港','🏝️ 台湾','🇸🇬 新加坡','🇯🇵 日本','🇺🇸 美国'];
assert(JSON.stringify([...shadowGroups.keys()]) === JSON.stringify(expectedOrder), 'Shadowrocket display order drift');
assert(JSON.stringify([...clashGroups.keys()]) === JSON.stringify(expectedOrder), 'Clash display order drift');
const parityGroups = ['🚀 默认代理','🌍 国际兜底','🤖 AI','🍎 Apple','🔎 Google','💻 GitHub','🪟 Microsoft','📱 社交媒体','▶️ YouTube','✈️ Telegram','🛑 广告拦截'];
for (const name of parityGroups) { assert(shadowGroups.has(name), 'Shadowrocket missing parity group: ' + name); assert(clashGroups.has(name), 'Clash missing parity group: ' + name); const shadowOptions = shadowGroups.get(name); const clashOptions = clashGroups.get(name).proxies || []; assert(JSON.stringify(shadowOptions) === JSON.stringify(clashOptions), 'proxy group drift between clients: ' + name); }
assert(!shadowGroups.has('🐟 FINAL'), 'Shadowrocket obsolete FINAL group must be absent');
assert(!clashGroups.has('🐟 FINAL'), 'Clash obsolete FINAL group must be absent');
const nodeGroups = ['👆 手动选择','🇭🇰 香港','🏝️ 台湾','🇸🇬 新加坡','🇯🇵 日本','🇺🇸 美国'];
const clashWithProvider = context.main({ 'proxy-providers': { WestData: { type:'http', url:'https://example.invalid/sub' } } });
const clashNodeGroups = new Map(clashWithProvider['proxy-groups'].map(group => [group.name, group]));
for (const name of nodeGroups) { assert(shadowFilters.has(name), 'Shadowrocket missing node filter: ' + name); assert(clashNodeGroups.has(name), 'Clash missing node group: ' + name); assert(shadowFilters.get(name) === clashNodeGroups.get(name).filter, 'node filter drift between clients: ' + name); }
const shadowRules = activeLines(section(shadowrocket, 'Rule')); const shadowAiRules = shadowRules.filter(rule => rule.endsWith(',🤖 AI')); const clashAiRules = clash.rules.filter(rule => rule.endsWith(',🤖 AI')); assert(JSON.stringify(shadowAiRules) === JSON.stringify(clashAiRules), 'AI manual rules drift between clients');
for (const rule of ['DOMAIN-SUFFIX,bytedance.com,DIRECT','DOMAIN-SUFFIX,bytedance.net,DIRECT']) { assert(shadowRules.includes(rule), 'Shadowrocket missing ByteDance direct rule'); assert(clash.rules.includes(rule), 'Clash missing ByteDance direct rule'); }
assert(!shadowRules.some(rule => rule.startsWith('FINAL,')), 'Shadowrocket must not use FINAL');
const canonicalShadow = ['Advertising/Advertising.list','Advertising/Advertising_Domain.list','Apple.list','Apple_Domain.list','Microsoft.list','GitHub.list','Telegram.list','bytedance.com','Twitter.list','Instagram.list','TikTok.list','YouTube.list','Google.list','/China/China.list','China_Domain.list','GEOIP,CN,DIRECT','DOMAIN-WILDCARD,*,🌍 国际兜底','IP-CIDR,0.0.0.0/0,🌍 国际兜底,no-resolve','IP-CIDR,::/0,🌍 国际兜底,no-resolve'];
const canonicalClash = ['RULE-SET,Advertising,','RULE-SET,Advertising_Domain,','RULE-SET,Apple,','RULE-SET,Apple_Domain,','RULE-SET,Microsoft,','RULE-SET,GitHub,','RULE-SET,Telegram,','bytedance.com','RULE-SET,Twitter,','RULE-SET,Instagram,','RULE-SET,TikTok,','RULE-SET,YouTube,','RULE-SET,Google,','RULE-SET,China,','RULE-SET,China_Domain,','GEOIP,CN,DIRECT','MATCH,🌍 国际兜底'];
function assertOrdered(rules, markers, label) { let previous = -1; for (const marker of markers) { const index = rules.findIndex((rule, i) => i > previous && rule.includes(marker)); assert(index !== -1, label + ' missing order marker: ' + marker); assert(index > previous, label + ' rule order drift near: ' + marker); previous = index; } }
assertOrdered(shadowRules, canonicalShadow, 'Shadowrocket'); assertOrdered(clash.rules, canonicalClash, 'Clash'); console.log('PASS: Shadowrocket and Clash parity checks');
