const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const routing = fs.readFileSync(path.join(root, 'Shadowrocket_Routing.conf'), 'utf8');
const customRulesText = fs.readFileSync(path.join(root, 'Custom.list'), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

function section(text, name) {
  const escaped = name.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp('(?:^|\\r?\\n)\\[' + escaped + '\\][ \\t]*\\r?\\n([\\s\\S]*?)(?=\\r?\\n\\[[^\\]]+\\]|$)'));
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

const expectedGroups = ['🚀 默认代理','👆 手动选择','🤖 AI','🍎 Apple','🔎 Google','💻 GitHub','🪟 Microsoft','📱 社交媒体','▶️ YouTube','✈️ Telegram','🧩 自定义','🔞 NSFW','🐟 漏网之鱼','🇭🇰 香港','🏝️ 台湾','🇸🇬 新加坡','🇯🇵 日本','🇺🇸 美国'];
assert(JSON.stringify([...groups.keys()]) === JSON.stringify(expectedGroups), 'proxy group display order changed unexpectedly');
assert(!groups.has('🛑 广告拦截'), 'legacy Advertising group must be absent');

const expectedDefaults = {'🚀 默认代理':'🇭🇰 香港','🧩 自定义':'🚀 默认代理','🔞 NSFW':'🚀 默认代理','🐟 漏网之鱼':'🚀 默认代理','🤖 AI':'🇸🇬 新加坡','🍎 Apple':'DIRECT','🔎 Google':'🚀 默认代理','💻 GitHub':'🚀 默认代理','🪟 Microsoft':'DIRECT','📱 社交媒体':'🚀 默认代理','▶️ YouTube':'🚀 默认代理','✈️ Telegram':'🚀 默认代理'};
for (const [name, expected] of Object.entries(expectedDefaults)) assert(groups.get(name)[0] === expected, name + ' default changed: expected ' + expected);

assert(JSON.stringify(groups.get('🧩 自定义').filter(x => !x.includes('='))) === JSON.stringify(['🚀 默认代理','🇭🇰 香港','🏝️ 台湾','🇸🇬 新加坡','🇯🇵 日本','🇺🇸 美国','👆 手动选择']), 'custom group options changed unexpectedly');
assert(JSON.stringify(groups.get('🔞 NSFW').filter(x => !x.includes('='))) === JSON.stringify(['🚀 默认代理','🇭🇰 香港','🏝️ 台湾','🇸🇬 新加坡','🇯🇵 日本','🇺🇸 美国','👆 手动选择']), 'NSFW group options changed unexpectedly');
const fullChoiceGroups = ['🤖 AI','🍎 Apple','🔎 Google','💻 GitHub','🪟 Microsoft','📱 社交媒体','▶️ YouTube','✈️ Telegram','🧩 自定义','🔞 NSFW','🐟 漏网之鱼'];
for (const name of fullChoiceGroups) {
  for (const choice of ['🇭🇰 香港','🏝️ 台湾','🇸🇬 新加坡','🇯🇵 日本','🇺🇸 美国','👆 手动选择']) {
    assert(groups.get(name).includes(choice), name + ' missing shared routing choice: ' + choice);
  }
}
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
assert(!rules.some(rule => /Advertising|广告拦截/.test(rule)), 'legacy Advertising routing rule must be absent');
const builtins = new Set(['DIRECT','REJECT']);
const allowedRuleTypes = new Set(['DOMAIN','DOMAIN-SUFFIX','DOMAIN-WILDCARD','IP-CIDR','IP-CIDR6','GEOIP','RULE-SET','DOMAIN-SET']);
for (const rule of rules) {
  const parts = rule.split(',');
  assert(allowedRuleTypes.has(parts[0]), 'unsupported Shadowrocket rule type: ' + rule);
  let policy;
  if (parts[0] === 'GEOIP') policy = parts[2];
  else policy = parts[parts.length - 1] === 'no-resolve' ? parts[parts.length - 2] : parts[parts.length - 1];
  assert(builtins.has(policy) || groups.has(policy), 'rule references missing policy: ' + policy);
}

const customMarker = 'RULE-SET,https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Custom.list,🧩 自定义';
const voiceMarker = 'RULE-SET,https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/OpenAI_Voice.list,🤖 AI';
const adultMarker = 'RULE-SET,https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Adult.list,🔞 NSFW';
assert(rules.includes(customMarker), 'Custom.list routing rule missing');
assert(rules.includes(adultMarker), 'Adult.list routing rule missing');
assert(!routing.includes('/Global.list'), 'routing must not use old Global.list');
assert(!groups.has('🌍 Global'), 'old Global policy group must not return');

const strictListRulePattern = /^DOMAIN(?:-SUFFIX)?,[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
const parseDomainRule = (rule, label) => {
  const [type, domain] = rule.split(',');
  return { type, domain: domain.toLowerCase(), raw: rule, label };
};
const rulesOverlap = (a, b) => (
  a.domain === b.domain ||
  (a.type === 'DOMAIN-SUFFIX' && b.domain.endsWith('.' + a.domain)) ||
  (b.type === 'DOMAIN-SUFFIX' && a.domain.endsWith('.' + b.domain))
);

const customRules = activeLines(customRulesText);
assert(customRules.length > 0, 'Custom.list must not be empty');
assert(new Set(customRules).size === customRules.length, 'duplicate Custom.list entry detected');
for (const rule of customRules) assert(strictListRulePattern.test(rule), 'unsupported Custom.list rule syntax: ' + rule);
assert(!customRules.some(rule => /^DOMAIN-SUFFIX,npmjs\.(com|org)$/.test(rule)), 'npm must remain owned by GitHub rules');

const adultRulesText = fs.readFileSync(path.join(root, 'Adult.list'), 'utf8');
const adultRules = activeLines(adultRulesText);
assert(adultRules.length > 0, 'Adult.list must not be empty');
assert(new Set(adultRules).size === adultRules.length, 'duplicate Adult.list entry detected');
for (const rule of adultRules) assert(strictListRulePattern.test(rule), 'unsupported Adult.list rule syntax: ' + rule);

const parsedCustom = customRules.map(rule => parseDomainRule(rule, 'Custom.list'));
const parsedAdult = adultRules.map(rule => parseDomainRule(rule, 'Adult.list'));
for (const [label, list] of [['Custom.list', parsedCustom], ['Adult.list', parsedAdult]]) {
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      assert(!rulesOverlap(list[i], list[j]), `overlapping/redundant ${label} entries: ${list[i].raw} vs ${list[j].raw}`);
    }
  }
}
for (const customItem of parsedCustom) {
  for (const adultItem of parsedAdult) {
    assert(!rulesOverlap(customItem, adultItem), 'overlapping rule between Custom.list and Adult.list: ' + adultItem.raw);
  }
}
const mainDomainRules = rules
  .filter(rule => rule.startsWith('DOMAIN,') || rule.startsWith('DOMAIN-SUFFIX,'))
  .map(rule => parseDomainRule(rule, 'Shadowrocket_Routing.conf'));
for (const [label, list] of [['Custom.list', parsedCustom], ['Adult.list', parsedAdult]]) {
  for (const item of list) {
    for (const mainItem of mainDomainRules) {
      assert(!rulesOverlap(item, mainItem), `overlapping rule between ${label} and Shadowrocket_Routing.conf: ${item.raw} vs ${mainItem.raw}`);
    }
  }
}

const terminalRules = ['DOMAIN-WILDCARD,*,🐟 漏网之鱼','IP-CIDR,0.0.0.0/0,🐟 漏网之鱼,no-resolve','IP-CIDR,::/0,🐟 漏网之鱼,no-resolve'];
assert(!rules.some(rule => rule.startsWith('FINAL,')), 'Shadowrocket FINAL must not be used');
assert(JSON.stringify(rules.slice(-3)) === JSON.stringify(terminalRules), 'explicit terminal rules must be the final three Shadowrocket rules');

const requiredOrder = [
  'RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Lan/Lan.list,DIRECT',
  'DOMAIN-SUFFIX,deepseek.com,DIRECT',
  'DOMAIN-SUFFIX,chatgpt.com,🤖 AI',
  'DOMAIN-SUFFIX,gemini.google,🤖 AI',
  'DOMAIN-SUFFIX,grok.com,🤖 AI',
  voiceMarker,
  'RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Apple/Apple.list,🍎 Apple',
  'DOMAIN-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Apple/Apple_Domain.list,🍎 Apple',
  'RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Microsoft/Microsoft.list,🪟 Microsoft',
  'RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/GitHub/GitHub.list,💻 GitHub',
  'RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Telegram/Telegram.list,✈️ Telegram',
  'DOMAIN-SUFFIX,bytedance.com,DIRECT',
  'DOMAIN-SUFFIX,bytedance.net,DIRECT',
  'RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Twitter/Twitter.list,📱 社交媒体',
  'RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Instagram/Instagram.list,📱 社交媒体',
  'RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/TikTok/TikTok.list,📱 社交媒体',
  'RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/YouTube/YouTube.list,▶️ YouTube',
  'RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Google/Google.list,🔎 Google',
  customMarker,
  adultMarker,
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
console.log('PASS: Shadowrocket routing, no Advertising, Custom.list, and Adult.list checks');
