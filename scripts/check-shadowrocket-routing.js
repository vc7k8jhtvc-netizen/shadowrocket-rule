const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const routing = fs.readFileSync(path.join(root, 'Shadowrocket_Routing.conf'), 'utf8');
const customRulesText = fs.readFileSync(path.join(root, 'Custom.list'), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

function section(text, name) {
  const escaped = name.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp('\\[' + escaped + '\\]\\s*\\n([\\s\\S]*?)(?=\\n\\[[^\\]]+\\]|$)'));
  assert(match, 'missing [' + name + '] section');
  return match[1];
}
function activeLines(text) {
  return text.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
}

const sections = [...routing.matchAll(/^\[([^\]]+)\]$/gm)].map(match => match[1]);
assert(JSON.stringify(sections) === JSON.stringify(['General','Proxy Group','Rule']), 'routing config must contain only [General], [Proxy Group] and [Rule]');
assert(JSON.stringify(activeLines(section(routing,'General'))) === JSON.stringify(['include = WestData.conf']), 'routing [General] must only include WestData.conf');

for (const forbidden of ['[Proxy]','[Host]','[URL Rewrite]','[MITM]','[Script]','dns-server','fallback-dns-server','tun-excluded-routes','skip-proxy','use-local-host-item-for-proxy','ca-passphrase','ca-p12']) {
  assert(!routing.includes(forbidden), 'routing config must not own base setting: ' + forbidden);
}

const groupLines = activeLines(section(routing,'Proxy Group'));
const groups = new Map();
for (const line of groupLines) {
  const eq = line.indexOf('=');
  assert(eq !== -1, 'invalid proxy group line');
  const name = line.slice(0,eq).trim();
  assert(!groups.has(name), 'duplicate proxy group: ' + name);
  const parts = line.slice(eq + 1).split(',').map(x => x.trim());
  assert(parts[0] === 'select', 'unsupported proxy group type: ' + name);
  groups.set(name, parts.slice(1));
}

const expectedGroups = ['🚀 默认代理','👆 手动选择','🤖 AI','🍎 Apple','🔎 Google','💻 GitHub','🪟 Microsoft','📱 社交媒体','▶️ YouTube','✈️ Telegram','🧩 自定义','🛑 广告拦截','🐟 漏网之鱼','🇭🇰 香港','🏝️ 台湾','🇸🇬 新加坡','🇯🇵 日本','🇺🇸 美国'];
assert(JSON.stringify([...groups.keys()]) === JSON.stringify(expectedGroups), 'proxy group display order changed unexpectedly');

const expectedDefaults = {'🚀 默认代理':'🇭🇰 香港','🧩 自定义':'🚀 默认代理','🐟 漏网之鱼':'🚀 默认代理','🤖 AI':'🇸🇬 新加坡','🍎 Apple':'DIRECT','🔎 Google':'🚀 默认代理','💻 GitHub':'🚀 默认代理','🪟 Microsoft':'DIRECT','📱 社交媒体':'🚀 默认代理','▶️ YouTube':'🚀 默认代理','✈️ Telegram':'🚀 默认代理','🛑 广告拦截':'REJECT'};
for (const [name, expected] of Object.entries(expectedDefaults)) assert(groups.get(name)[0] === expected, name + ' default changed: expected ' + expected);

assert(JSON.stringify(groups.get('🧩 自定义').filter(x => !x.includes('='))) === JSON.stringify(['🚀 默认代理','🇺🇸 美国','🇯🇵 日本','🇸🇬 新加坡']), 'custom group options changed unexpectedly');
assert(groups.get('🐟 漏网之鱼').includes('DIRECT'), 'fallback group must include DIRECT');
assert(groups.get('🐟 漏网之鱼').includes('👆 手动选择'), 'fallback group must include manual selection');

const expectedFilters = {'👆 手动选择':'^.+ \\| .+$','🇭🇰 香港':'^.*Hong Kong \\| .+$','🏝️ 台湾':'^.*Taiwan \\| .+$','🇸🇬 新加坡':'^.*Singapore \\| .+$','🇯🇵 日本':'^.*Japan \\| .+$','🇺🇸 美国':'^.*United States \\| .+$'};
for (const [name, filter] of Object.entries(expectedFilters)) assert(groups.get(name).includes('policy-regex-filter=' + filter), name + ' node filter changed unexpectedly');

const groupEdges = new Map();
for (const [name, options] of groups) {
  const members = options.filter(option => !option.includes('='));
  for (const member of members) assert(groups.has(member) || ['DIRECT','REJECT'].includes(member), 'group references missing policy: ' + name + ' -> ' + member);
  groupEdges.set(name, members.filter(member => groups.has(member)));
}
const visiting = new Set(), visited = new Set();
function visitGroup(name) {
  assert(!visiting.has(name), 'proxy group cycle detected at: ' + name);
  if (visited.has(name)) return;
  visiting.add(name);
  for (const member of groupEdges.get(name)) visitGroup(member);
  visiting.delete(name);
  visited.add(name);
}
for (const name of groups.keys()) visitGroup(name);

const rules = activeLines(section(routing,'Rule'));
assert(new Set(rules).size === rules.length, 'duplicate Shadowrocket rules detected');
const builtins = new Set(['DIRECT','REJECT']);
for (const rule of rules) {
  const parts = rule.split(',');
  let policy;
  if (parts[0] === 'GEOIP') policy = parts[2];
  else policy = parts[parts.length - 1] === 'no-resolve' ? parts[parts.length - 2] : parts[parts.length - 1];
  assert(builtins.has(policy) || groups.has(policy), 'rule references missing policy: ' + policy);
}

const customMarker = 'RULE-SET,https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Custom.list,🧩 自定义';
assert(rules.includes(customMarker), 'Custom.list routing rule missing');
assert(!routing.includes('/Global.list'), 'routing must not use old Global.list');
assert(!groups.has('🌍 Global'), 'old Global policy group must not return');

const customRules = activeLines(customRulesText);
assert(customRules.length > 0, 'Custom.list must not be empty');
assert(new Set(customRules).size === customRules.length, 'duplicate Custom.list entry detected');
for (const rule of customRules) assert(/^DOMAIN(?:-SUFFIX)?,[^,\s]+$/.test(rule), 'unsupported Custom.list rule syntax: ' + rule);
assert(!customRules.some(rule => /^DOMAIN-SUFFIX,npmjs\.(com|org)$/.test(rule)), 'npm must remain owned by GitHub rules');

const terminalRules = ['DOMAIN-WILDCARD,*,🐟 漏网之鱼','IP-CIDR,0.0.0.0/0,🐟 漏网之鱼,no-resolve','IP-CIDR,::/0,🐟 漏网之鱼,no-resolve'];
assert(!rules.some(rule => rule.startsWith('FINAL,')), 'Shadowrocket FINAL must not be used');
assert(JSON.stringify(rules.slice(-3)) === JSON.stringify(terminalRules), 'explicit terminal rules must be the final three Shadowrocket rules');

const requiredOrder = [
  'DOMAIN-SUFFIX,deepseek.com,DIRECT',
  'DOMAIN-SUFFIX,chatgpt.com,🤖 AI',
  'DOMAIN,gemini.google.com,🤖 AI',
  'DOMAIN-SUFFIX,grok.com,🤖 AI',
  'RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Advertising/Advertising.list,🛑 广告拦截',
  'RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Google/Google.list,🔎 Google',
  customMarker,
  'RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/China/China.list,DIRECT',
  'DOMAIN-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/China/China_Domain.list,DIRECT',
  'GEOIP,CN,DIRECT',
  ...terminalRules
];
let previous = -1;
for (const marker of requiredOrder) {
  const index = rules.indexOf(marker);
  assert(index !== -1, 'missing required rule: ' + marker);
  assert(index > previous, 'rule order regression near: ' + marker);
  previous = index;
}

assert(!routing.includes('🐟 FINAL'), 'obsolete FINAL policy group must be absent');
console.log('PASS: Shadowrocket routing and Custom.list checks');
