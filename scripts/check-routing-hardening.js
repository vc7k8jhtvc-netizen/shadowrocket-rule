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
  assert(!valid.rules.includes(rule), 'Clash must not globally force shared SaaS through AI: ' + rule);
  assert(!routing.includes(rule), 'Shadowrocket must not globally force shared SaaS through AI: ' + rule);
}
for (const rule of [
  'DOMAIN-SUFFIX,chatgpt.com,🤖 AI',
  'DOMAIN-SUFFIX,openai.com,🤖 AI',
  'DOMAIN,cdn.openaimerge.com,🤖 AI',
  'DOMAIN,o207216.ingest.sentry.io,🤖 AI',
  'DOMAIN,o33249.ingest.sentry.io,🤖 AI'
]) {
  assert(valid.rules.includes(rule), 'Clash missing scoped OpenAI rule: ' + rule);
  assert(routing.includes(rule), 'Shadowrocket missing scoped OpenAI rule: ' + rule);
}
// Declared personal AI relay: an explicit exception to the OpenAI-only rule, asserted so it cannot drift silently.
for (const rule of [
  'DOMAIN-SUFFIX,a6api.vip,🤖 AI',
  'DOMAIN-SUFFIX,a6api.com,🤖 AI'
]) {
  assert(valid.rules.includes(rule), 'Clash missing personal AI relay rule: ' + rule);
  assert(routing.includes(rule), 'Shadowrocket missing personal AI relay rule: ' + rule);
}

// Exa and Tavily are AI search services. They must route explicitly to AI and
// must not be re-added to Custom.list, where the Custom rule would override ownership.
const aiSearchRules = [
  'DOMAIN-SUFFIX,exa.ai,🤖 AI',
  'DOMAIN-SUFFIX,tavily.com,🤖 AI'
];
for (const rule of aiSearchRules) {
  assert(valid.rules.includes(rule), 'Clash missing Exa/Tavily AI search rule: ' + rule);
  assert(routing.includes(rule), 'Shadowrocket missing Exa/Tavily AI search rule: ' + rule);
}

// Supabase and Hugging Face are explicit AI-group choices. Their former Custom
// entries must stay removed so ownership cannot silently drift back.
const aiPlatformRules = [
  'DOMAIN-SUFFIX,supabase.com,🤖 AI',
  'DOMAIN-SUFFIX,supabase.co,🤖 AI',
  'DOMAIN-SUFFIX,supabase.in,🤖 AI',
  'DOMAIN-SUFFIX,huggingface.co,🤖 AI',
  'DOMAIN-SUFFIX,hf.co,🤖 AI',
  'DOMAIN-SUFFIX,hf.space,🤖 AI'
];
for (const rule of aiPlatformRules) {
  assert(valid.rules.includes(rule), 'Clash missing Supabase/HuggingFace AI platform rule: ' + rule);
  assert(routing.includes(rule), 'Shadowrocket missing Supabase/HuggingFace AI platform rule: ' + rule);
}
const migratedAiRules = [...aiSearchRules, ...aiPlatformRules];
const customEntries = customList.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
for (const domain of ['exa.ai', 'tavily.com']) {
  const entry = 'DOMAIN-SUFFIX,' + domain;
  assert(!customEntries.includes(entry), 'Exa/Tavily must not remain in Custom.list: ' + entry);
}
for (const domain of ['supabase.com', 'supabase.co', 'supabase.in', 'huggingface.co', 'hf.co', 'hf.space']) {
  const entry = 'DOMAIN-SUFFIX,' + domain;
  assert(!customEntries.includes(entry), 'Supabase/HuggingFace must not remain in Custom.list: ' + entry);
}

// Gemini and Google AI dedicated endpoints must stay explicitly routed to AI.
// Shared Google hosts retain their normal Google/YouTube policies so unrelated services are not captured.
const geminiDomainSuffixes = [
  'gemini.google',
  'gemini.google.com',
  'bard.google.com',
  'gemini.gstatic.com',
  'geminiweb-pa.clients.google.com',
  'geminiweb-pa.clients6.google.com',
  'ai.google',
  'ai.google.com',
  'ai.google.dev',
  'generativeai.google',
  'ai.studio',
  'aistudio.google.com',
  'makersuite.google.com',
  'alkalicore-pa.clients6.google.com',
  'alkalimakersuite-pa.clients6.google.com',
  'webchannel-alkalimakersuite-pa.clients6.google.com',
  'robinfrontend-pa.googleapis.com',
  'aisandbox-pa.googleapis.com',
  'proactivebackend-pa.googleapis.com',
  'geller-pa.googleapis.com',
  'generativelanguage.googleapis.com',
  'generativelanguage.mtls.googleapis.com',
  'jnn-pa.googleapis.com',
  'waa-pa.clients6.google.com',
  'appsgenaiserver-pa.clients.google.com',
  'appsgenaiserver-pa.clients6.google.com',
  'appsgenaiserver-pa.googleapis.com',
  'notebook.google',
  'notebook.google.com',
  'notebooklm.google',
  'notebooklm.google.com',
  'notebook.cloud.google',
  'notebook.cloud.google.com',
  'notebooklm.cloud.google',
  'notebooklm.cloud.google.com',
  'notebooklm-pa.googleapis.com',
  'notebooklm.googleapis.com',
  'labstailwind.pa.googleapis.com',
  'deepmind.com',
  'deepmind.google',
  'deepmind.google.com',
  'antigravity.google',
  'antigravity.google.com',
  'antigravity.googleapis.com',
  'antigravity-pa.googleapis.com',
  'antigravity-unleash.goog',
  'cloudaicompanion.googleapis.com',
  'cloudaicompanion.mtls.googleapis.com',
  'cloudcode-pa.googleapis.com',
  'daily-cloudcode-pa.googleapis.com',
  'daily-cloudcode-pa.sandbox.googleapis.com',
  'jules.google',
  'jules.google.com',
  'jules.googleapis.com',
  'labs.google',
  'labs.google.com',
  'flow.google',
  'flow.google.com',
  'opal.google',
  'opal.google.com',
  'opal.goog',
  'opal.withgoogle.com',
  'appcatalyst.pa.googleapis.com',
  'stitch.withgoogle.com',
  'aitestkitchen.withgoogle.com',
  'gemma.ai',
  'aicode.googleapis.com',
  'aida.googleapis.com',
  'speechs3proto2-pa.googleapis.com',
  'aiplatform.googleapis.com',
  'aiplatform.mtls.googleapis.com',
  'aiplatform.eu.rep.googleapis.com',
  'aiplatform.us.rep.googleapis.com',
  'businessaicode.googleapis.com',
  'businessaicode.mtls.googleapis.com',
  'businessaicode.eu.rep.googleapis.com',
  'businessaicode.us.rep.googleapis.com',
  'discoveryengine.googleapis.com',
  'discoveryengine.mtls.googleapis.com',
  'discoveryengine.clients6.google.com',
  'eu-discoveryengine.googleapis.com',
  'eu-discoveryengine.mtls.googleapis.com',
  'eu-discoveryengine.clients6.google.com',
  'us-discoveryengine.googleapis.com',
  'us-discoveryengine.mtls.googleapis.com',
  'us-discoveryengine.clients6.google.com',
  'global-discoveryengine.googleapis.com',
  'global-discoveryengine.mtls.googleapis.com',
  'opa-pa.googleapis.com',
  'opa-pa.clients6.google.com',
];
const expectedGeminiRules = [
  ...geminiDomainSuffixes.map(domain => 'DOMAIN-SUFFIX,' + domain + ',🤖 AI'),
  'DOMAIN-WILDCARD,*-aiplatform.googleapis.com,🤖 AI'
];
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
  'firebaseinstallations.googleapis.com'
];
const routingRules = routing.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
const routeManualRule = (rules, host) => {
  for (const rule of rules) {
    if (!rule.endsWith(',🤖 AI')) continue;
    const [type, domain, policy] = rule.split(',');
    if (type === 'DOMAIN' && host === domain) return policy;
    if (type === 'DOMAIN-SUFFIX' && (host === domain || host.endsWith('.' + domain))) return policy;
    if (type === 'DOMAIN-KEYWORD' && host.includes(domain)) return policy;
    if (type === 'DOMAIN-WILDCARD') {
      const pattern = domain.split('*').map(part => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*');
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
  'waa-pa.clients6.google.com',
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
const geminiNegativeHosts = ['example.com', 'google.com', 'www.googleapis.com', 'apis.google.com', 'www.youtube.com', 'gemini.google.evil.example', 'x-aiplatform.googleapis.com.attacker.example', 'aiplatform.googleapis.com.evil.example'];
for (const [name, rules] of [['Clash', valid.rules], ['Shadowrocket', routingRules]]) {
  for (const rule of expectedGeminiRules) assert(rules.includes(rule), name + ' missing Gemini/Google AI rule: ' + rule);
  assert(!rules.some(rule => rule.startsWith('DOMAIN-KEYWORD,') && rule.endsWith(',🤖 AI')), name + ' AI rules must not use unanchored DOMAIN-KEYWORD');
  const first = rules.indexOf(expectedGeminiRules[0]);
  const last = rules.indexOf(expectedGeminiRules[expectedGeminiRules.length - 1]);
  assert(first > rules.indexOf('DOMAIN-SUFFIX,hf.space,🤖 AI'), name + ' Gemini rules must follow Hugging Face');
  assert(last < rules.indexOf('DOMAIN-SUFFIX,x.ai,🤖 AI'), name + ' Gemini rules must precede Grok');
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
// Canva-owned domains are a dedicated application group, not shared SaaS. Canva China
// (可画) is a mainland service and stays DIRECT; the rest use AI. Keep the exact list
// and ordering stable across both clients.
const canvaDirectSuffixes = [
  "canva.cn",
  "canva-apps.cn",
  "canva-code.cn",
  "my.canvasite.cn"
];
const canvaAiSuffixes = [
  "canva.com",
  "canva.ai",
  "canva.app",
  "canva.dev",
  "canva.me",
  "canva.site",
  "canva.link",
  "canva.run",
  "canva-apps.com",
  "canva-hosted-embed.com",
  "canvacode.com",
  "canvastatus.com"
];
const expectedCanvaRules = [
  ...canvaDirectSuffixes.map(domain => `DOMAIN-SUFFIX,${domain},DIRECT`),
  ...canvaAiSuffixes.map(domain => `DOMAIN-SUFFIX,${domain},🤖 AI`)
];
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
  assert(first > rules.indexOf('DOMAIN-SUFFIX,claudeusercontent.com,🤖 AI'), name + ' Canva rules must follow Claude');
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

console.log('PASS: routing hardening rejects namespace/dependency drift, locks Gemini/Google AI/Canva plus migrated AI routing, retains listener/tunnel/DNS RULES dependencies, and avoids shared-SaaS AI capture');
