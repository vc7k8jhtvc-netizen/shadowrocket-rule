const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const routingPath = path.join(root, 'Shadowrocket_Routing_v2.7.0.conf');
const globalPath = path.join(root, 'Global.list');

const routing = fs.readFileSync(routingPath, 'utf8');
const globalRulesText = fs.readFileSync(globalPath, 'utf8');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

function section(text, name) {
  const escaped = name.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp('\\[' + escaped + '\\]\\s*\\n([\\s\\S]*?)(?=\\n\\[[^\\]]+\\]|$)'));
  assert(match, 'missing [' + name + '] section');
  return match[1];
}

function activeLines(text) {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

const sections = [...routing.matchAll(/^\[([^\]]+)\]$/gm)].map(match => match[1]);
assert(
  JSON.stringify(sections) === JSON.stringify(['General', 'Proxy Group', 'Rule']),
  'routing config must contain only [General], [Proxy Group] and [Rule]'
);

const general = activeLines(section(routing, 'General'));
assert(
  JSON.stringify(general) === JSON.stringify(['include = WestData.conf']),
  'routing [General] must only include WestData.conf'
);

for (const forbidden of [
  '[Proxy]',
  '[Host]',
  '[URL Rewrite]',
  '[MITM]',
  '[Script]',
  'dns-server',
  'fallback-dns-server',
  'tun-excluded-routes',
  'skip-proxy',
  'use-local-host-item-for-proxy',
  'ca-passphrase',
  'ca-p12'
]) {
  assert(!routing.includes(forbidden), 'routing config must not own base setting: ' + forbidden);
}

const proxyGroupLines = activeLines(section(routing, 'Proxy Group'));
const groups = new Map();
for (const line of proxyGroupLines) {
  const eq = line.indexOf('=');
  assert(eq !== -1, 'invalid proxy group line');
  const name = line.slice(0, eq).trim();
  const parts = line.slice(eq + 1).split(',').map(item => item.trim());
  assert(parts[0] === 'select', 'unsupported proxy group type: ' + name);
  groups.set(name, parts.slice(1));
}

const expectedGroups = [
  '🌐 手动选择', '🇭🇰 香港', '🇹🇼 台湾', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国',
  '🤖 AI', '🍎 Apple', '🌐 Google', '💻 GitHub', '🪟 Microsoft',
  '📱 社交', '▶️ YouTube', '📲 Telegram', '🌍 Global', '🚀 默认代理', '🐟 FINAL'
];
assert(groups.size === expectedGroups.length, 'unexpected proxy group count: ' + groups.size);
for (const name of expectedGroups) assert(groups.has(name), 'missing proxy group: ' + name);

const expectedDefaults = {
  '🤖 AI': '🇺🇸 美国',
  '🍎 Apple': 'DIRECT',
  '🌐 Google': '🚀 默认代理',
  '💻 GitHub': '🚀 默认代理',
  '🪟 Microsoft': 'DIRECT',
  '📱 社交': '🚀 默认代理',
  '▶️ YouTube': '🚀 默认代理',
  '📲 Telegram': '🚀 默认代理',
  '🌍 Global': '🚀 默认代理',
  '🚀 默认代理': '🇭🇰 香港',
  '🐟 FINAL': 'DIRECT'
};
for (const [name, expected] of Object.entries(expectedDefaults)) {
  assert(groups.get(name)[0] === expected, name + ' default changed: expected ' + expected);
}

const expectedFilters = {
  '🌐 手动选择': '^.+ \\| .+$',
  '🇭🇰 香港': '^.*Hong Kong \\| .+$',
  '🇹🇼 台湾': '^.*Taiwan \\| .+$',
  '🇸🇬 新加坡': '^.*Singapore \\| .+$',
  '🇯🇵 日本': '^.*Japan \\| .+$',
  '🇺🇸 美国': '^.*United States \\| .+$'
};
for (const [name, filter] of Object.entries(expectedFilters)) {
  assert(groups.get(name).includes('policy-regex-filter=' + filter), name + ' node filter changed unexpectedly');
}

const rules = activeLines(section(routing, 'Rule'));
assert(new Set(rules).size === rules.length, 'duplicate Shadowrocket rules detected');

const builtins = new Set(['DIRECT', 'REJECT']);
for (const rule of rules) {
  const parts = rule.split(',');
  let policy;
  if (parts[0] === 'FINAL') policy = parts[1];
  else if (parts[0] === 'GEOIP') policy = parts[2];
  else policy = parts[parts.length - 1] === 'no-resolve' ? parts[parts.length - 2] : parts[parts.length - 1];
  assert(builtins.has(policy) || groups.has(policy), 'rule references missing policy: ' + policy);
}

const requiredOrder = [
  'DOMAIN,gemini.google.com,🤖 AI',
  'RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Apple/Apple.list,🍎 Apple',
  'DOMAIN-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Apple/Apple_Domain.list,🍎 Apple',
  'RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Microsoft/Microsoft.list,🪟 Microsoft',
  'RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/GitHub/GitHub.list,💻 GitHub',
  'RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Telegram/Telegram.list,📲 Telegram',
  'DOMAIN-SUFFIX,bytedance.com,DIRECT',
  'RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/TikTok/TikTok.list,📱 社交',
  'RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/YouTube/YouTube.list,▶️ YouTube',
  'RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Google/Google.list,🌐 Google',
  'RULE-SET,https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Global.list,🌍 Global',
  'RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/China/China.list,DIRECT',
  'DOMAIN-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/China/China_Domain.list,DIRECT',
  'GEOIP,CN,DIRECT',
  'FINAL,🐟 FINAL'
];

let previous = -1;
for (const marker of requiredOrder) {
  const index = rules.indexOf(marker);
  assert(index !== -1, 'missing required rule: ' + marker);
  assert(index > previous, 'rule order regression near: ' + marker);
  previous = index;
}
assert(rules[rules.length - 1] === 'FINAL,🐟 FINAL', 'FINAL must remain the last rule');

const globalRules = activeLines(globalRulesText);
assert(new Set(globalRules).size === globalRules.length, 'duplicate Global.list entry detected');
for (const rule of globalRules) {
  assert(/^DOMAIN(?:-SUFFIX)?,[^,\s]+$/.test(rule), 'unsupported Global.list rule syntax');
}
assert(!globalRules.some(rule => /^DOMAIN-SUFFIX,npmjs\.(com|org)$/.test(rule)), 'npm must remain owned by GitHub rules');

console.log('PASS: Shadowrocket routing checks');
