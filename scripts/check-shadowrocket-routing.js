const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const routingPath = path.join(root, 'Shadowrocket_Routing.conf');
const routing = fs.readFileSync(routingPath, 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
function section(text, name) {
  const escaped = name.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp('\\[' + escaped + '\\]\\s*\\n([\\s\\S]*?)(?=\\n\\[[^\\]]+\\]|$)'));
  assert(match, 'missing [' + name + '] section');
  return match[1];
}
function activeLines(text) { return text.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#')); }
const sections = [...routing.matchAll(/^\[([^\]]+)\]$/gm)].map(match => match[1]);
assert(JSON.stringify(sections) === JSON.stringify(['General', 'Proxy Group', 'Rule']), 'routing config must contain only [General], [Proxy Group] and [Rule]');
const general = activeLines(section(routing, 'General'));
assert(JSON.stringify(general) === JSON.stringify(['include = WestData.conf']), 'routing [General] must only include WestData.conf');
for (const forbidden of ['[Proxy]','[Host]','[URL Rewrite]','[MITM]','[Script]','dns-server','fallback-dns-server','tun-excluded-routes','skip-proxy','use-local-host-item-for-proxy','ca-passphrase','ca-p12']) assert(!routing.includes(forbidden), 'routing config must not own base setting: ' + forbidden);
const proxyGroupLines = activeLines(section(routing, 'Proxy Group'));
const groups = new Map();
for (const line of proxyGroupLines) {
  const eq = line.indexOf('='); assert(eq !== -1, 'invalid proxy group line');
  const name = line.slice(0, eq).trim(); assert(!groups.has(name), 'duplicate proxy group: ' + name);
  const parts = line.slice(eq + 1).split(',').map(item => item.trim()); assert(parts[0] === 'select', 'unsupported proxy group type: ' + name); groups.set(name, parts.slice(1));
}
const expectedGroups = ['🚀 默认代理','🌍 国际兜底','👆 手动选择','🤖 AI','🍎 Apple','🔎 Google','💻 GitHub','🪟 Microsoft','📱 社交媒体','▶️ YouTube','✈️ Telegram','🛑 广告拦截','🇭🇰 香港','🏝️ 台湾','🇸🇬 新加坡','🇯🇵 日本','🇺🇸 美国'];
assert(JSON.stringify([...groups.keys()]) === JSON.stringify(expectedGroups), 'proxy group display order changed unexpectedly');
const expectedDefaults = {'🚀 默认代理':'🇭🇰 香港','🌍 国际兜底':'🚀 默认代理','🤖 AI':'🇸🇬 新加坡','🍎 Apple':'DIRECT','🔎 Google':'🚀 默认代理','💻 GitHub':'🚀 默认代理','🪟 Microsoft':'DIRECT','📱 社交媒体':'🚀 默认代理','▶️ YouTube':'🚀 默认代理','✈️ Telegram':'🚀 默认代理','🛑 广告拦截':'REJECT'};
for (const [name, expected] of Object.entries(expectedDefaults)) assert(groups.get(name)[0] === expected, name + ' default changed: expected ' + expected);
assert(groups.get('🌍 国际兜底').includes('DIRECT'), 'international fallback must include DIRECT');
assert(groups.get('🌍 国际兜底').includes('👆 手动选择'), 'international fallback must include manual selection');
const expectedFilters = {'👆 手动选择':'^.+ \\| .+$','🇭🇰 香港':'^.*Hong Kong \\| .+$','🏝️ 台湾':'^.*Taiwan \\| .+$','🇸🇬 新加坡':'^.*Singapore \\| .+$','🇯🇵 日本':'^.*Japan \\| .+$','🇺🇸 美国':'^.*United States \\| .+$'};
for (const [name, filter] of Object.entries(expectedFilters)) assert(groups.get(name).includes('policy-regex-filter=' + filter), name + ' node filter changed unexpectedly');
const groupEdges = new Map();
for (const [name, options] of groups) {
  const members = options.filter(option => !option.includes('='));
  for (const member of members) assert(groups.has(member) || ['DIRECT','REJECT'].includes(member), 'group references missing policy: ' + name + ' -> ' + member);
  groupEdges.set(name, members.filter(member => groups.has(member)));
}
const visiting = new Set(), visited = new Set();
function visitGroup(name) { assert(!visiting.has(name), 'proxy group cycle detected at: ' + name); if (visited.has(name)) return; visiting.add(name); for (const member of groupEdges.get(name)) visitGroup(member); visiting.delete(name); visited.add(name); }
for (const name of groups.keys()) visitGroup(name);
const rules = activeLines(section(routing, 'Rule')); assert(new Set(rules).size === rules.length, 'duplicate Shadowrocket rules detected');
const builtins = new Set(['DIRECT','REJECT']);
for (const rule of rules) { const parts = rule.split(','); let policy; if (parts[0] === 'GEOIP') policy = parts[2]; else policy = parts[parts.length - 1] === 'no-resolve' ? parts[parts.length - 2] : parts[parts.length - 1]; assert(builtins.has(policy) || groups.has(policy), 'rule references missing policy: ' + policy); }
const deepseekRule = 'DOMAIN-SUFFIX,deepseek.com,DIRECT';
assert(rules.includes(deepseekRule), 'DeepSeek DIRECT rule missing');
const terminalRules = ['DOMAIN-WILDCARD,*,🌍 国际兜底','IP-CIDR,0.0.0.0/0,🌍 国际兜底,no-resolve','IP-CIDR,::/0,🌍 国际兜底,no-resolve'];
assert(!rules.some(rule => rule.startsWith('FINAL,')), 'Shadowrocket FINAL must not be used');
assert(JSON.stringify(rules.slice(-3)) === JSON.stringify(terminalRules), 'explicit terminal rules must be the final three Shadowrocket rules');
const requiredOrder = [deepseekRule,'DOMAIN-SUFFIX,chatgpt.com,🤖 AI','DOMAIN,gemini.google.com,🤖 AI','RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Advertising/Advertising.list,🛑 广告拦截','DOMAIN-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Advertising/Advertising_Domain.list,🛑 广告拦截','RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Apple/Apple.list,🍎 Apple','DOMAIN-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Apple/Apple_Domain.list,🍎 Apple','RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Microsoft/Microsoft.list,🪟 Microsoft','RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/GitHub/GitHub.list,💻 GitHub','RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Telegram/Telegram.list,✈️ Telegram','DOMAIN-SUFFIX,bytedance.com,DIRECT','RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/TikTok/TikTok.list,📱 社交媒体','RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/YouTube/YouTube.list,▶️ YouTube','RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Google/Google.list,🔎 Google','RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/China/China.list,DIRECT','DOMAIN-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/China/China_Domain.list,DIRECT','GEOIP,CN,DIRECT',...terminalRules];
let previous = -1; for (const marker of requiredOrder) { const index = rules.indexOf(marker); assert(index !== -1, 'missing required rule: ' + marker); assert(index > previous, 'rule order regression near: ' + marker); previous = index; }
assert(!routing.includes('🐟 FINAL'), 'obsolete FINAL policy group must be absent');
assert(!routing.includes('Global.list'), 'routing must not depend on Global.list');
console.log('PASS: Shadowrocket routing checks');
