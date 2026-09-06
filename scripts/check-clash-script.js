const fs = require('fs');
const vm = require('vm');

const scriptPath = process.argv[2];
if (!scriptPath) throw new Error('usage: node check-clash-script.js <script>');

const source = fs.readFileSync(scriptPath, 'utf8');
const logs = [];
const context = {
  console: {
    log: message => logs.push({ level: 'log', message }),
    warn: message => logs.push({ level: 'warn', message }),
    error: message => logs.push({ level: 'error', message })
  }
};
vm.createContext(context);
vm.runInContext(source, context, { filename: scriptPath });
if (typeof context.main !== 'function') throw new Error('main(config) is missing');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const group = (config, name) =>
  config['proxy-groups'].find(item => item.name === name);

const directInput = {
  dns: { enable: false, marker: 'subscription-dns' },
  hosts: { 'subscription.example': '192.0.2.1' },
  ipv6: true,
  proxies: [
    { name: 'Hong Kong | HK-01', type: 'ss', server: '127.0.0.1', port: 8388, cipher: 'aes-128-gcm', password: 'test-only' },
    { name: 'United States | US-01', type: 'ss', server: '127.0.0.1', port: 8389, cipher: 'aes-128-gcm', password: 'test-only' },
    { name: 'Japan | JP-01', type: 'ss', server: '127.0.0.1', port: 8390, cipher: 'aes-128-gcm', password: 'test-only' },
    { name: '🇺🇸 US-EXTRA', type: 'ss', server: '127.0.0.1', port: 8391, cipher: 'aes-128-gcm', password: 'test-only' }
  ],
  rules: ['MATCH,DIRECT'],
  'proxy-groups': []
};
const direct = context.main(JSON.parse(JSON.stringify(directInput)));

assert(group(direct, '🇺🇸 美国').proxies.includes('United States | US-01'), 'US node matching');
assert(!group(direct, '🌐 全部节点').proxies.includes('🇺🇸 US-EXTRA'), 'all-node group must match Shadowrocket naming filter');
assert(
  JSON.stringify(group(direct, '🇹🇼 台湾').proxies) === JSON.stringify(['🌐 全部节点']),
  'empty region must fall back to all nodes'
);
assert(!group(direct, '🇹🇼 台湾').proxies.includes('DIRECT'), 'region must not silently use DIRECT');
assert(direct.dns && direct.dns.marker === 'subscription-dns', 'must preserve subscription DNS');
assert(direct.hosts && direct.hosts['subscription.example'] === '192.0.2.1', 'must preserve subscription hosts');
assert(direct.ipv6 === true, 'must not override subscription IPv6 setting');
assert(direct.mode === 'rule', 'must set rule mode');
assert(direct.profile && direct.profile['store-selected'], 'must retain selected-policy persistence');
assert(direct['rule-providers'].Global.format === 'text', 'Global text provider');
assert(direct['rule-providers'].Apple_Domain.behavior === 'domain', 'Apple domain provider');
assert(direct['rule-providers'].China_Domain.behavior === 'domain', 'China domain provider');
assert(logs.some(item => item.message.includes('开始生成')), 'start console output');
assert(logs.some(item => item.message.includes('地区匹配')), 'region console output');
assert(logs.some(item => item.level === 'warn' && item.message.includes('台湾')), 'fallback warning');
assert(logs.some(item => item.message.includes('完成：')), 'completion console output');
assert(!logs.some(item => item.message.includes('HK-01')), 'console must not expose node names');
assert(
  direct.rules.includes('RULE-SET,Global,🌍 Global') &&
  !direct.rules.some(rule => rule.includes('exa.ai')),
  'Global.list must not be copied into the script'
);

const provider = context.main({
  'proxy-providers': { WestData: { type: 'http', url: 'https://example.invalid/sub' } }
});
assert(group(provider, '🌐 全部节点').use.includes('WestData'), 'proxy-provider support');
assert(group(provider, '🌐 全部节点').filter === '^.+ \\| .+$', 'all-node provider filter must match Shadowrocket');
for (const name of ['🇭🇰 香港', '🇹🇼 台湾', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国']) {
  const region = group(provider, name);
  assert(region.use.includes('WestData'), `${name} provider inclusion`);
  assert(!region.filter.startsWith('(?i)'), `${name} provider filter must match Shadowrocket case-sensitive semantics`);
  assert(region['empty-fallback'] === 'REJECT', `${name} empty provider region must fail closed`);
  assert(!region.proxies || !region.proxies.includes('🌐 全部节点'), `${name} provider fallback must not mask filtering`);
}

let rejectedEmpty = false;
try {
  context.main({});
} catch (error) {
  rejectedEmpty = /proxies/.test(error.message);
}
assert(rejectedEmpty, 'empty subscriptions must fail closed');
assert(logs.some(item => item.level === 'error' && item.message.includes('已停止生成')), 'error console output');

const ruleSetNames = new Set(Object.keys(direct['rule-providers']));
for (const rule of direct.rules) {
  if (!rule.startsWith('RULE-SET,')) continue;
  const name = rule.split(',')[1];
  assert(ruleSetNames.has(name), `missing rule provider: ${name}`);
}

const globalIndex = direct.rules.indexOf('RULE-SET,Global,🌍 Global');
const chinaIndex = direct.rules.indexOf('RULE-SET,China,DIRECT');
const finalIndex = direct.rules.indexOf('MATCH,🐟 FINAL');
const chinaDomainIndex = direct.rules.indexOf('RULE-SET,China_Domain,DIRECT');
assert(globalIndex < chinaIndex && chinaIndex < chinaDomainIndex && chinaDomainIndex < finalIndex, 'Global/China/China_Domain/FINAL order');
assert(direct['rule-providers'].China_Domain.url.includes('China_Domain.list'), 'China domain rule-provider source');

if (process.env.MIHOMO_CONFIG_OUTPUT) {
  fs.writeFileSync(process.env.MIHOMO_CONFIG_OUTPUT, JSON.stringify(direct, null, 2));
}
console.log('PASS: Clash Verge Rev script checks');
