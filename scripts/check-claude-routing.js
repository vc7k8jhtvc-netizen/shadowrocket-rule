// Validate Claude-only routing coverage, ordering and parity without private subscription data.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const shadow = fs.readFileSync(path.join(root, 'Shadowrocket_Routing.conf'), 'utf8');
const clashSource = fs.readFileSync(path.join(root, 'Clash_Verge_Rev_Script.js'), 'utf8');
const ruleSection = shadow.split(/^\[Rule\]\s*$/m)[1];
assert(ruleSection, 'Shadowrocket Rule section missing');
const shadowRules = ruleSection.split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'));
const ctx = { console: { log() {}, warn() {}, error() {} } };
vm.createContext(ctx);
vm.runInContext(clashSource, ctx);
const clash = ctx.main({ proxies: [{ name: 'Singapore | Fixture', type: 'ss', server: '127.0.0.1', port: 1, cipher: 'aes-128-gcm', password: 'test-only' }] });
const suffixes = [
  'ant.dev', 'anthropic.com', 'anthropic.team', 'chatbotclaude.com', 'clau.de',
  'claude.ai', 'claude.app', 'claude.com', 'claude.dev', 'claude.new', 'claude.site',
  'claudeacademy.com', 'claudemcpclient.com', 'claudemcpcontent.com', 'claudepages.dev',
  'claudestudio.com', 'claudeusercontent.com'
];
const exactHosts = ['servd-anthropic-website.b-cdn.net', 'o1158394.ingest.us.sentry.io'];
const expected = [
  ...suffixes.map(domain => `DOMAIN-SUFFIX,${domain},🤖 AI`),
  ...exactHosts.map(domain => `DOMAIN,${domain},🤖 AI`)
];
for (const [name, rules] of [['Shadowrocket', shadowRules], ['Clash', clash.rules]]) {
  const first = rules.indexOf(expected[0]);
  const last = rules.indexOf(expected[expected.length - 1]);
  assert(first > rules.indexOf('DOMAIN-SUFFIX,grok.x.com,🤖 AI'), name + ' Claude rules must follow Grok');
  const apple = rules.findIndex(rule => rule.startsWith('RULE-SET,') && /(?:\/Apple\/Apple\.list|,Apple,🍎 Apple)/.test(rule));
  assert(apple > last, name + ' Claude rules must precede Apple and China/fallback');
  assert(JSON.stringify(rules.slice(first, last + 1)) === JSON.stringify(expected), name + ' Claude rules must remain contiguous and complete');
  const match = host => {
    for (const rule of rules) {
      const [type, domain, policy] = rule.split(',');
      if (type === 'DOMAIN-SUFFIX' && (host === domain || host.endsWith('.' + domain))) return policy;
      if (type === 'DOMAIN' && host === domain) return policy;
    }
    return null;
  };
  for (const host of ['claude.ai', 'claude.app', 'claude.site', 'claudepages.dev', 'claudemcpclient.com', 'claudemcpcontent.com', 'api.anthropic.com', 'chatbotclaude.com', 'clau.de', 'ant.dev', 'servd-anthropic-website.b-cdn.net']) {
    assert(match(host) === '🤖 AI', name + ' Claude host not routed through AI: ' + host);
  }
  for (const host of ['unrelated.example', 'fakeclaude.ai.evil.example', 'cdn.jsdelivr.net', 'deepseek.com']) {
    assert(match(host) !== '🤖 AI', name + ' unintended Claude-related AI match: ' + host);
  }
}
const manualAi = rules => rules.filter(rule => rule.startsWith('DOMAIN') && rule.endsWith(',🤖 AI'));
assert(JSON.stringify(manualAi(shadowRules)) === JSON.stringify(manualAi(clash.rules)), 'Manual AI routing parity between clients');
assert(shadow.includes('include = WestData.conf'), 'WestData include must be preserved');
console.log('PASS: Claude dedicated domains, order, AI parity, and negative-match samples');
