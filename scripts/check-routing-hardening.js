const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const clashPath = path.join(root, 'Clash_Verge_Rev_Script.js');
const routingPath = path.join(root, 'Shadowrocket_Routing.conf');
const westdataCheck = path.join(root, 'scripts', 'check-westdata-local.js');
const clashSource = fs.readFileSync(clashPath, 'utf8');
const routing = fs.readFileSync(routingPath, 'utf8');
const customListPath = path.join(root, 'Custom.list');
const customList = fs.readFileSync(customListPath, 'utf8');
const context = { console: { log() {}, warn() {}, error() {} } };
vm.createContext(context);
vm.runInContext(clashSource, context, { filename: clashPath });
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const node = (name, port = 8388) => ({ name, type: 'ss', server: '127.0.0.1', port, cipher: 'aes-128-gcm', password: 'test-only' });

const routingRuleSectionMatch = routing.match(/(?:^|\r?\n)\[Rule\][ \t]*\r?\n([\s\S]*?)(?=\r?\n\[[^\]]+\]|$)/);
assert(routingRuleSectionMatch, 'Shadowrocket [Rule] section missing');
const routingRules = routingRuleSectionMatch[1].split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));

const aiSource = JSON.parse(fs.readFileSync(path.join(root, 'rules', 'ai-rules.json'), 'utf8'));
const expectedSectionIds = ['openai', 'openai-voice', 'personal-relay', 'ai-search', 'ai-platforms', 'gemini', 'grok', 'claude', 'canva'];
assert(Array.isArray(aiSource.sections) && JSON.stringify(aiSource.sections.map(section => section.id)) === JSON.stringify(expectedSectionIds), 'rules/ai-rules.json section layout drift');
const aiSections = new Map(aiSource.sections.map(section => [section.id, section.rules]));
const sectionRules = id => {
  const rules = aiSections.get(id);
  assert(Array.isArray(rules) && rules.length > 0, 'rules/ai-rules.json empty section: ' + id);
  return rules;
};
const allAiSourceRules = aiSource.sections.flatMap(section => section.rules);

const sharedAiRules = [
  'DOMAIN-SUFFIX,ct.sendgrid.net,🤖 AI',
  'DOMAIN-SUFFIX,intercom.io,🤖 AI',
  'DOMAIN-SUFFIX,intercomcdn.com,🤖 AI',
  'DOMAIN,cdn.workos.com,🤖 AI',
  'DOMAIN,challenges.cloudflare.com,🤖 AI',
  'DOMAIN,forwarder.workos.com,🤖 AI',
  'DOMAIN,humb.apple.com,🤖 AI',
  'DOMAIN,images.workoscdn.com,🤖 AI',
  'DOMAIN,js.stripe.com,🤖 AI',
  'DOMAIN,rum.browser-intake-datadoghq.com,🤖 AI',
  'DOMAIN,setup.workos.com,🤖 AI',
  'DOMAIN,workos.imgix.net,🤖 AI',
  // Statsig's shared SDK/config CDN serves many non-AI apps.
  'DOMAIN-SUFFIX,featureassets.org,🤖 AI'
];
const valid = context.main({ proxies: [node('Hong Kong | HK-01')] });
for (const rule of sharedAiRules) {
  assert(!allAiSourceRules.includes(rule), 'ai-rules.json must not globally force shared SaaS through AI: ' + rule);
  assert(!valid.rules.includes(rule), 'Clash must not globally force shared SaaS through AI: ' + rule);
  assert(!routingRules.includes(rule), 'Shadowrocket must not globally force shared SaaS through AI: ' + rule);
}

const openaiRules = [...sectionRules('openai'), ...sectionRules('openai-voice')];
for (const rule of openaiRules) {
  assert(rule.endsWith(',🤖 AI'), 'OpenAI section rule must route to AI: ' + rule);
  assert(valid.rules.includes(rule), 'Clash missing scoped OpenAI rule: ' + rule);
  assert(routingRules.includes(rule), 'Shadowrocket missing scoped OpenAI rule: ' + rule);
}
for (const anchor of [
  'DOMAIN-SUFFIX,openai.com,🤖 AI',
  'DOMAIN-SUFFIX,chatgpt.com,🤖 AI',
  'DOMAIN-WILDCARD,chatgpt-async-webps-prod-*.webpubsub.azure.com,🤖 AI',
  'DOMAIN-SUFFIX,chatgpt.livekit.cloud,🤖 AI',
  'DOMAIN-SUFFIX,host.livekit.cloud,🤖 AI',
  'DOMAIN-SUFFIX,turn.livekit.cloud,🤖 AI'
]) {
  assert(openaiRules.includes(anchor), 'OpenAI core anchor missing from ai-rules.json: ' + anchor);
}

const grokRules = sectionRules('grok');
for (const rule of grokRules) {
  assert(rule.endsWith(',🤖 AI'), 'Grok section rule must route to AI: ' + rule);
  assert(valid.rules.includes(rule), 'Clash missing scoped Grok rule: ' + rule);
  assert(routingRules.includes(rule), 'Shadowrocket missing scoped Grok rule: ' + rule);
}
const grokRule = 'DOMAIN-SUFFIX,grok.x.com,🤖 AI';
assert(grokRules.includes(grokRule), 'Grok core anchor missing from ai-rules.json: ' + grokRule);
assert(valid.rules.indexOf(grokRule) < valid.rules.indexOf('RULE-SET,Twitter,📱 社交媒体,no-resolve'), 'Clash grok.x.com must precede Twitter');
assert(routingRules.indexOf(grokRule) < routingRules.indexOf('RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Twitter/Twitter.list,📱 社交媒体'), 'Shadowrocket grok.x.com must precede Twitter');
const shadowVoiceRule = 'RULE-SET,https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/OpenAI_Voice.list,🤖 AI';
const clashVoiceRule = 'RULE-SET,OpenAI_Voice,🤖 AI,no-resolve';
assert(valid.rules.includes(clashVoiceRule), 'Clash missing OpenAI voice rule');
assert(routingRules.includes(shadowVoiceRule), 'Shadowrocket missing OpenAI voice rule');
assert(valid['rule-providers'].OpenAI_Voice && valid['rule-providers'].OpenAI_Voice.format === 'text', 'Clash OpenAI voice provider missing');
assert(valid.rules.indexOf(clashVoiceRule) < valid.rules.indexOf('RULE-SET,Apple,🍎 Apple,no-resolve'), 'Clash OpenAI voice rule order drift');
assert(routingRules.indexOf(shadowVoiceRule) < routingRules.indexOf('RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/Apple/Apple.list,🍎 Apple'), 'Shadowrocket OpenAI voice rule order drift');
const voiceList = fs.readFileSync(path.join(root, 'OpenAI_Voice.list'), 'utf8');
const voiceEntries = voiceList.split(/\r?\n/).filter(line => line.startsWith('IP-CIDR') || line.startsWith('IP-CIDR6'));
assert(voiceEntries.length > 0, 'OpenAI voice list must contain host IP routes');
for (const line of voiceEntries) {
  const isV4 = line.startsWith('IP-CIDR,') && line.includes('/32,');
  const isV6 = line.startsWith('IP-CIDR6,') && line.includes('/128,');
  assert(line.endsWith(',no-resolve') && (isV4 || isV6), 'OpenAI voice list must contain only host routes with no-resolve: ' + line);
}

// Declared personal AI relay: an explicit policy cap outside vendor domains, locked exactly so it cannot expand silently.
const personalRelayRules = [
  'DOMAIN-SUFFIX,a6api.vip,🤖 AI',
  'DOMAIN-SUFFIX,a6api.com,🤖 AI'
];
assert(JSON.stringify(sectionRules('personal-relay')) === JSON.stringify(personalRelayRules), 'personal AI relay rule set must match exact declared entries');
for (const rule of personalRelayRules) {
  assert(valid.rules.includes(rule), 'Clash missing personal AI relay rule: ' + rule);
  assert(routingRules.includes(rule), 'Shadowrocket missing personal AI relay rule: ' + rule);
}

// Exa, Tavily and Jina are AI search/reader services; Supabase and Hugging Face are explicit AI-group choices.
// Their rules are sourced from rules/ai-rules.json and must stay out of Custom.list.
const aiSearchRules = sectionRules('ai-search');
for (const anchor of ['DOMAIN-SUFFIX,exa.ai,🤖 AI', 'DOMAIN-SUFFIX,tavily.com,🤖 AI', 'DOMAIN-SUFFIX,jina.ai,🤖 AI']) {
  assert(aiSearchRules.includes(anchor), 'Exa/Tavily/Jina AI search anchor missing: ' + anchor);
}
for (const rule of aiSearchRules) {
  assert(rule.endsWith(',🤖 AI'), 'AI search rule must route to AI: ' + rule);
  assert(valid.rules.includes(rule), 'Clash missing Exa/Tavily/Jina AI search rule: ' + rule);
  assert(routingRules.includes(rule), 'Shadowrocket missing Exa/Tavily/Jina AI search rule: ' + rule);
}

const aiPlatformRules = sectionRules('ai-platforms');
for (const anchor of ['DOMAIN-SUFFIX,supabase.com,🤖 AI', 'DOMAIN-SUFFIX,huggingface.co,🤖 AI', 'DOMAIN-SUFFIX,hf.co,🤖 AI']) {
  assert(aiPlatformRules.includes(anchor), 'Supabase/HuggingFace AI platform anchor missing: ' + anchor);
}
for (const rule of aiPlatformRules) {
  assert(rule.endsWith(',🤖 AI'), 'AI platform rule must route to AI: ' + rule);
  assert(valid.rules.includes(rule), 'Clash missing Supabase/HuggingFace AI platform rule: ' + rule);
  assert(routingRules.includes(rule), 'Shadowrocket missing Supabase/HuggingFace AI platform rule: ' + rule);
}

const migratedAiRules = [...aiSearchRules, ...aiPlatformRules];
const customEntries = customList.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
for (const rule of aiSearchRules) {
  const domain = rule.split(',')[1];
  assert(!customEntries.includes('DOMAIN-SUFFIX,' + domain) && !customEntries.includes('DOMAIN,' + domain), 'Exa/Tavily/Jina must not remain in Custom.list: ' + domain);
}
for (const rule of aiPlatformRules) {
  const domain = rule.split(',')[1];
  assert(!customEntries.includes('DOMAIN-SUFFIX,' + domain) && !customEntries.includes('DOMAIN,' + domain), 'Supabase/HuggingFace must not remain in Custom.list: ' + domain);
}
assert(!customEntries.includes('DOMAIN,cdn.auth0.com') && !customEntries.includes('DOMAIN-SUFFIX,cdn.auth0.com'), 'shared Auth0 CDN must not be captured in Custom.list');

// Gemini and Google AI dedicated endpoints are derived from rules/ai-rules.json;
// security redlines (shared Google host exclusion, wildcard anchoring, representative match samples) stay independent.
const expectedGeminiRules = sectionRules('gemini');
assert(expectedGeminiRules.includes('DOMAIN-WILDCARD,*-aiplatform.googleapis.com,🤖 AI'), 'Gemini anchored regional Vertex wildcard missing');
for (const rule of expectedGeminiRules) {
  assert(rule.endsWith(',🤖 AI'), 'Gemini rule must route to AI: ' + rule);
}
const sharedGeminiDependencyHosts = [
  'apis.google.com',
  'www.googleapis.com',
  'www.google.com',
  'play.google.com',
  'lh3.googleusercontent.com',
  'ssl.gstatic.com',
  'www.gstatic.com',
  'fonts.googleapis.com',
  'i.ytimg.com',
  'www.youtube.com',
  'www.googletagmanager.com',
  'www.google-analytics.com',
  'googleads.g.doubleclick.net',
  'accounts.google.com',
  'firebaseinstallations.googleapis.com',
  'jnn-pa.googleapis.com',
  'waa-pa.clients6.google.com'
];
const routeManualRule = (rules, host) => {
  for (const rule of rules) {
    if (!rule.endsWith(',🤖 AI')) continue;
    const [type, domain, policy] = rule.split(',');
    if (type === 'DOMAIN' && host === domain) return policy;
    if (type === 'DOMAIN-SUFFIX' && (host === domain || host.endsWith('.' + domain))) return policy;
    if (type === 'DOMAIN-KEYWORD' && host.includes(domain)) return policy;
    if (type === 'DOMAIN-WILDCARD') {
      const pattern = domain.split('*').map(part => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^.]*');
      if (new RegExp('^' + pattern + '$').test(host)) return policy;
    }
  }
  return null;
};
const geminiPositiveHosts = [
  'gemini.google.com',
  'geminiweb-pa.clients6.google.com',
  'aistudio.google.com',
  'ai.studio',
  'notebook.google.com',
  'notebook.cloud.google.com',
  'notebooklm.google.com',
  'notebooklm.cloud.google.com',
  'notebooklm.googleapis.com',
  'ai.google.dev',
  'generativelanguage.googleapis.com',
  'alkali.generativelanguage.googleapis.com',
  'geller-pa.googleapis.com',
  'appsgenaiserver-pa.googleapis.com',
  'us-central1-aiplatform.googleapis.com',
  'cloudaicompanion.googleapis.com',
  'antigravity.google',
  'antigravity.google.com',
  'antigravity.googleapis.com',
  'antigravity-pa.googleapis.com',
  'antigravity-unleash.goog',
  'labs.google',
  'flow.google.com',
  'opal.google.com',
  'stitch.withgoogle.com',
  'aida.googleapis.com',
  'aicode.googleapis.com',
  'gemma.ai',
  'jules.google.com'
];
const geminiNegativeHosts = ['example.com', 'google.com', 'www.googleapis.com', 'apis.google.com', 'www.youtube.com', 'jnn-pa.googleapis.com', 'waa-pa.clients6.google.com', 'gemini.google.evil.example', 'x-aiplatform.googleapis.com.attacker.example', 'aiplatform.googleapis.com.evil.example'];
for (const [name, rules] of [['ai-rules.json', allAiSourceRules], ['Clash', valid.rules], ['Shadowrocket', routingRules]]) {
  for (const rule of expectedGeminiRules) assert(rules.includes(rule), name + ' missing Gemini/Google AI rule: ' + rule);
  assert(!rules.some(rule => rule.startsWith('DOMAIN-KEYWORD,') && rule.endsWith(',🤖 AI')), name + ' AI rules must not use unanchored DOMAIN-KEYWORD');
  const first = rules.indexOf(expectedGeminiRules[0]);
  const last = rules.indexOf(expectedGeminiRules[expectedGeminiRules.length - 1]);
  assert(first > rules.indexOf(aiPlatformRules[aiPlatformRules.length - 1]), name + ' Gemini rules must follow AI platforms');
  assert(last < rules.indexOf(grokRules[0]), name + ' Gemini rules must precede Grok');
  assert(JSON.stringify(rules.slice(first, last + 1)) === JSON.stringify(expectedGeminiRules), name + ' Gemini dedicated-domain rules must match exact AI list');
  for (const host of sharedGeminiDependencyHosts) {
    for (const type of ['DOMAIN', 'DOMAIN-SUFFIX']) {
      assert(!rules.includes(type + ',' + host + ',🤖 AI'), name + ' shared Google host must not be globally routed to AI: ' + host);
    }
  }
  for (const host of geminiPositiveHosts) {
    assert(routeManualRule(rules, host) === '🤖 AI', name + ' Gemini host not routed through AI: ' + host);
  }
  for (const host of geminiNegativeHosts) {
    assert(routeManualRule(rules, host) !== '🤖 AI', name + ' unintended Gemini AI match: ' + host);
  }
}

// Canva-owned domains are sourced from rules/ai-rules.json; enforce the mainland (.cn -> DIRECT) vs global (AI) split independently.
const expectedCanvaRules = sectionRules('canva');
assert(expectedCanvaRules.includes('DOMAIN-SUFFIX,canva.cn,DIRECT'), 'Canva dedicated-domain rules must keep canva.cn DIRECT');
assert(expectedCanvaRules.includes('DOMAIN-SUFFIX,canva.com,🤖 AI'), 'Canva dedicated-domain rules must keep canva.com on AI');
for (const rule of expectedCanvaRules) {
  assert(/^DOMAIN-SUFFIX,(?:canva|my\.canvasite\.)/i.test(rule), 'Canva dedicated-domain rules must only contain Canva-owned suffixes: ' + rule);
  const [, domain, policy] = rule.split(',');
  const expectedPolicy = domain.endsWith('.cn') ? 'DIRECT' : '🤖 AI';
  assert(policy === expectedPolicy, 'Canva dedicated-domain rules must keep .cn DIRECT and global AI: ' + rule);
}
const claudeRules = sectionRules('claude');
for (const [name, rules] of [['Clash', valid.rules], ['Shadowrocket', routingRules]]) {
  const customIndex = rules.findIndex(rule => rule.startsWith('RULE-SET,') && /,🧩 自定义(?:,no-resolve)?$/.test(rule));
  assert(customIndex !== -1, name + ' Custom routing rule missing');
  for (const rule of migratedAiRules) {
    const index = rules.indexOf(rule);
    assert(index !== -1 && index < customIndex, name + ' AI-migrated rule must precede Custom: ' + rule);
  }
  const actual = rules.filter(rule => /^DOMAIN-SUFFIX,(?:canva|my\.canvasite\.)/i.test(rule));
  assert(JSON.stringify(actual) === JSON.stringify(expectedCanvaRules), name + ' Canva dedicated-domain rules must match exact DIRECT/AI list');
  const first = rules.indexOf(expectedCanvaRules[0]);
  const last = rules.indexOf(expectedCanvaRules[expectedCanvaRules.length - 1]);
  assert(first > rules.indexOf(claudeRules[claudeRules.length - 1]), name + ' Canva rules must follow Claude');
  const apple = rules.findIndex(rule => rule.startsWith('RULE-SET,') && /(?:\/Apple\/Apple\.list|,Apple,🍎 Apple)/.test(rule));
  assert(apple > last, name + ' Canva rules must precede Apple and China/fallback');
  assert(JSON.stringify(rules.slice(first, last + 1)) === JSON.stringify(expectedCanvaRules), name + ' Canva rules must remain contiguous');
}

function expectReject(input, diagnostic) {
  const before = JSON.stringify(input);
  let error;
  try { context.main(input); } catch (caught) { error = caught; }
  assert(error, 'invalid subscription must be rejected');
  assert(String(error.message).includes(diagnostic), 'unexpected rejection diagnostic: ' + error.message);
  assert(JSON.stringify(input) === before, 'rejected subscription must not be partially rewritten');
}

expectReject({ proxies: [node('Hong Kong | DUP', 1), node('Hong Kong | DUP', 2)] }, '重复节点名称');
expectReject({ proxies: [node('Hong Kong | OK', 1), node('🚀 默认代理', 2)] }, '项目策略组名称冲突');
expectReject({ proxies: [{ ...node('Hong Kong | Dialer'), 'dialer-proxy': 'MissingPolicy' }] }, '不存在的策略');
expectReject({
  proxies: [node('Hong Kong | Base')],
  'proxy-providers': { WestData: { type: 'inline', payload: [node('Singapore | Provider')], proxy: 'MissingPolicy' } }
}, '不存在的策略');
expectReject({
  proxies: [{ ...node('Hong Kong | Base'), 'dialer-proxy': 'Transport' }],
  'proxy-groups': [{ name: 'Transport', type: 'select', use: ['MissingProvider'] }]
}, '不存在的 proxy-provider');
expectReject({
  proxies: [{ ...node('Hong Kong | Base'), 'dialer-proxy': 'Transport' }],
  'proxy-groups': [{ name: 'Transport', type: 'select', proxies: ['MissingPolicy'] }]
}, '不存在的策略');

expectReject({
  proxies: [{ ...node('Hong Kong | Base'), 'dialer-proxy': 'G' }],
  'proxy-groups': [{ name: 'G', type: 'select', proxies: 'Hong Kong | Base' }]
}, 'proxies 格式无效');
expectReject({ proxies: [node('Hong Kong | Base')], listeners: [{ name: 'l', type: 'socks', port: 7891, rule: 'sub' }] }, 'sub-rules');
expectReject({ proxies: [node('Hong Kong | Base')], tunnels: [{ network: ['tcp'], address: '127.0.0.1:1', target: 'a.invalid:80', proxy: 'MissingPolicy' }] }, '不存在的策略');

// Mihomo reserves the DNS "#RULES" tag; it must pass through untouched.
const respectRules = context.main({ proxies: [node('Hong Kong | Base')], dns: { nameserver: ['https://1.1.1.1/dns-query#RULES'] } });
assert(respectRules.dns.nameserver[0] === 'https://1.1.1.1/dns-query#RULES', 'DNS #RULES tag must be preserved verbatim');

// Listener / tunnel exits are retained like dialer-proxy, and orphaned sub-rules are dropped.
const attached = context.main({
  proxies: [node('Hong Kong | Base')],
  'proxy-groups': [{ name: 'Sub', type: 'select', proxies: ['Hong Kong | Base'] }],
  listeners: [{ name: 'l', type: 'socks', port: 7891, proxy: 'Sub' }],
  tunnels: [{ network: ['tcp'], address: '127.0.0.1:1', target: 'a.invalid:80', proxy: 'Sub' }, 'tcp,127.0.0.1:2,a.invalid:80,Sub'],
  'sub-rules': { s1: ['MATCH,Sub'] }
});
const attachedGroups = new Set(attached['proxy-groups'].map(group => group.name));
const listenerExit = attached.listeners[0].proxy;
assert(listenerExit.startsWith('__subscription_group_') && attachedGroups.has(listenerExit), 'listener proxy must map to a retained group');
assert(attached.tunnels[0].proxy === listenerExit, 'tunnel proxy must map to the retained group');
assert(attached.tunnels[1] === 'tcp,127.0.0.1:2,a.invalid:80,' + listenerExit, 'compact tunnel proxy must map to the retained group');
assert(!('sub-rules' in attached), 'orphaned sub-rules must be removed');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'westdata-hardening-'));
try {
  const conf = path.join(temp, 'WestData.conf');
  const regions = ['Hong Kong', 'Taiwan', 'Singapore', 'Japan', 'United States'];
  const credentialKey = 'pass' + 'word';
  const fixtureCredential = credentialKey + '=test-only';
  const lines = regions.map((region, index) => `${region} | Fixture = ss,127.0.0.1,${1000 + index},${fixtureCredential}`);
  lines.push(`Hong Kong | Fixture = ss,127.0.0.1,2000,${fixtureCredential}`);
  fs.writeFileSync(conf, '[Proxy]\n' + lines.join('\n') + '\n');
  const result = spawnSync(process.execPath, [westdataCheck, conf], { encoding: 'utf8', timeout: 10000 });
  assert(result.status === 1, 'WestData checker must reject duplicate proxy names');
  assert(/duplicate/i.test(result.stdout + result.stderr), 'WestData duplicate diagnostic missing');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log('PASS: routing hardening rejects namespace/dependency drift, locks OpenAI voice, Gemini/Google AI, Canva, Grok and migrated AI routing, retains listener/tunnel/DNS RULES dependencies, and avoids shared-SaaS AI capture');
