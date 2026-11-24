// Validate Claude-only routing coverage, ordering and parity without private subscription data.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const shadow = fs.readFileSync(path.join(root, 'Shadowrocket_Routing.conf'), 'utf8');
const clashSource = fs.readFileSync(path.join(root, 'Clash_Verge_Rev_Script.js'), 'utf8');
const aiSource = JSON.parse(fs.readFileSync(path.join(root, 'rules', 'ai-rules.json'), 'utf8'));
const ruleSectionMatch = shadow.match(/(?:^|\r?\n)\[Rule\][ \t]*\r?\n([\s\S]*?)(?=\r?\n\[[^\]]+\]|$)/);
assert(ruleSectionMatch, 'Shadowrocket Rule section missing');
const shadowRules = ruleSectionMatch[1].split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'));
const ctx = { console: { log() {}, warn() {}, error() {} } };
vm.createContext(ctx);
vm.runInContext(clashSource, ctx);
const clash = ctx.main({ proxies: [{ name: 'Singapore | Fixture', type: 'ss', server: '127.0.0.1', port: 1, cipher: 'aes-128-gcm', password: 'test-only' }] });
const claudeSection = (aiSource.sections || []).find(section => section.id === 'claude');
assert(claudeSection && Array.isArray(claudeSection.rules) && claudeSection.rules.length > 0, 'rules/ai-rules.json missing Claude rules');
const expected = claudeSection.rules;
for (const rule of expected) {
  assert(rule.endsWith(',🤖 AI') && !rule.startsWith('DOMAIN-KEYWORD,'), 'Claude rules must route dedicated domains to AI: ' + rule);
}
for (const [name, rules] of [['Shadowrocket', shadowRules], ['Clash', clash.rules]]) {
  const first = rules.indexOf(expected[0]);
  const last = rules.indexOf(expected[expected.length - 1]);
  assert(first !== -1 && last !== -1, name + ' Claude rules missing');
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
