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
  'DOMAIN,workos.imgix.net,🤖 AI'
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

console.log('PASS: routing hardening rejects namespace/dependency drift and avoids shared-SaaS AI capture');
