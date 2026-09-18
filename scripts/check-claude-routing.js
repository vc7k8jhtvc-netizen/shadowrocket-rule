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
const suffixes = ['claude.ai', 'claude.com', 'anthropic.com', 'claudeusercontent.com'];
const expected = suffixes.map(domain => `DOMAIN-SUFFIX,${domain},🤖 AI`);
for (const [name, rules] of [['Shadowrocket', shadowRules], ['Clash', clash.rules]]) {
  const claudeRules = rules.filter(rule => /(?:claude|anthropic)/i.test(rule));
  assert(JSON.stringify(claudeRules) === JSON.stringify(expected), name + ' Claude rules must match exact dedicated-domain list');
  const first = rules.indexOf(expected[0]);
  const last = rules.indexOf(expected[expected.length - 1]);
  assert(first > rules.indexOf('DOMAIN-SUFFIX,grok.com,🤖 AI'), name + ' Claude rules must follow Grok');
  const apple = rules.findIndex(rule => rule.startsWith('RULE-SET,') && /(?:\/Apple\/Apple\.list|,Apple,🍎 Apple)/.test(rule));
  assert(apple > last, name + ' Claude rules must precede Apple and China/fallback');
  assert(JSON.stringify(rules.slice(first, last + 1)) === JSON.stringify(expected), name + ' Claude rules must remain contiguous');
  const match = host => {
    for (const rule of rules) {
      const [type, domain, policy] = rule.split(',');
      if (type === 'DOMAIN-SUFFIX' && (host === domain || host.endsWith('.' + domain))) return policy;
      if (type === 'DOMAIN' && host === domain) return policy;
    }
    return null;
  };
  for (const host of ['claude.ai', 'www.claude.ai', 'platform.claude.com', 'api.anthropic.com', 'assets-proxy.anthropic.com', 'demo.claudeusercontent.com']) {
    assert(match(host) === '🤖 AI', name + ' Claude host not routed through AI: ' + host);
  }
  for (const host of ['unrelated.example', 'fakeclaude.ai.evil.example', 'cdn.jsdelivr.net', 'deepseek.com']) {
    assert(match(host) !== '🤖 AI', name + ' unintended Claude-related AI match: ' + host);
  }
}
assert(JSON.stringify(shadowRules.filter(r => r.endsWith(',🤖 AI'))) === JSON.stringify(clash.rules.filter(r => r.endsWith(',🤖 AI'))), 'Claude AI routing parity between clients');
assert(shadow.includes('include = WestData.conf'), 'WestData include must be preserved');
console.log('PASS: Claude dedicated domains, order, AI parity, and negative-match samples');
