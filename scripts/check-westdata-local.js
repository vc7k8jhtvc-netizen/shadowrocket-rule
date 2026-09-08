const fs = require('fs');
const path = require('path');

const input = process.argv[2];
if (!input) {
  console.error('Usage: node scripts/check-westdata-local.js /path/to/private-westdata.conf');
  process.exit(2);
}

const file = path.resolve(process.cwd(), input);
const text = fs.readFileSync(file, 'utf8');

function section(name) {
  const match = text.match(new RegExp('\\[' + name + '\\]\\s*\\n([\\s\\S]*?)(?=\\n\\[[^\\]]+\\]|$)', 'i'));
  return match ? match[1] : '';
}

const proxyProtocols = new Set([
  'ss', 'ssr', 'vmess', 'vless', 'trojan', 'http', 'https', 'socks5',
  'snell', 'hysteria', 'hysteria2', 'tuic', 'wireguard'
]);

const general = new Map();
for (const raw of section('General').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const eq = line.indexOf('=');
  if (eq === -1) continue;
  general.set(line.slice(0, eq).trim(), line.slice(eq + 1).trim());
}
if (general.get('use-local-host-item-for-proxy') !== 'true') {
  console.error('FAIL: WestData base no longer enables proxy Host mappings');
  process.exit(1);
}

const names = [];
for (const raw of section('Proxy').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const match = line.match(/^(.+?)\s*=\s*([A-Za-z0-9_-]+)\s*,/);
  if (!match || !proxyProtocols.has(match[2].toLowerCase())) continue;
  names.push(match[1].trim());
}

if (!names.length) {
  console.error('FAIL: no supported proxy entries found in [Proxy]');
  process.exit(1);
}

const allPattern = /^.+ \| .+$/;
const regions = {
  'Hong Kong': /^.*Hong Kong \| .+$/,
  'Taiwan': /^.*Taiwan \| .+$/,
  'Singapore': /^.*Singapore \| .+$/,
  'Japan': /^.*Japan \| .+$/,
  'United States': /^.*United States \| .+$/
};

const informationalPattern = /流量|剩余|traffic|quota|到期|expire|expiry|有效期/i;
const compatibleNames = names.filter(name => allPattern.test(name));
const informationalNames = names.filter(name => !allPattern.test(name) && informationalPattern.test(name));
const unexpectedNames = names.filter(name => !allPattern.test(name) && !informationalPattern.test(name));

console.log('WestData local compatibility check');
console.log('Proxy entries: ' + names.length);
console.log('Compatible with all-node filter: ' + compatibleNames.length);
console.log('Ignored informational entries: ' + informationalNames.length);
console.log('Unexpected incompatible entries: ' + unexpectedNames.length);

let failed = unexpectedNames.length !== 0;
for (const [region, pattern] of Object.entries(regions)) {
  const count = names.filter(name => pattern.test(name)).length;
  console.log(region + ': ' + count);
  if (count === 0) failed = true;
}

const expectedHosts = new Map([
  ['cos-ap-beijing.toshiba-asdf.com', 'cos-ap-beijing.micron-asdf.com'],
  ['oss-cn-guangzhou.toshiba-asdf.com', 'oss-cn-guangzhou.micron-asdf.com'],
  ['oss-cn-shanghai.toshiba-asdf.com', 'oss-cn-shanghai.micron-asdf.com']
]);
const actualHosts = new Map();
for (const raw of section('Host').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const eq = line.indexOf('=');
  if (eq === -1) continue;
  actualHosts.set(line.slice(0, eq).trim(), line.slice(eq + 1).trim());
}

let hostMatches = 0;
for (const [source, target] of expectedHosts) {
  if (actualHosts.get(source) === target) hostMatches++;
}
console.log('Required Host mappings: ' + hostMatches + '/' + expectedHosts.size);
if (hostMatches !== expectedHosts.size) failed = true;

const rewriteLines = section('URL Rewrite')
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => line && !line.startsWith('#'));
// Parse redirect structure and execute representative URLs instead of matching keywords.
const redirects = rewriteLines.flatMap(line => {
  const parts = line.match(/^(\S+)\s+(\S+)\s+(301|302|307|308)$/);
  if (!parts) return [];
  try { return [{ pattern: new RegExp(parts[1]), replacement: parts[2] }]; }
  catch { return []; }
});
function coversGoogleRedirect(domain) {
  for (const protocol of ['http', 'https']) {
    for (const prefix of ['', 'www.']) {
      for (const suffix of ['', '/search?q=audit']) {
        const input = protocol + '://' + prefix + domain + suffix;
        // The first matching redirect owns this request; a later valid rule cannot mask it.
        const rule = redirects.find(item => item.pattern.test(input));
        if (!rule) return false;
        try {
          const source = new URL(input);
          const target = new URL(input.replace(rule.pattern, rule.replacement));
          if (target.protocol !== 'https:' || !['google.com', 'www.google.com'].includes(target.hostname) ||
              target.username || target.password || target.port ||
              target.pathname !== source.pathname || target.search !== source.search || target.hash) return false;
        } catch { return false; }
      }
    }
  }
  return true;
}
const hasGoogleCnRewrite = coversGoogleRedirect('google.cn');
const hasGCnRewrite = coversGoogleRedirect('g.cn');
console.log('Google CN rewrites: ' + ((hasGoogleCnRewrite && hasGCnRewrite) ? '2/2' : 'incomplete'));
if (!hasGoogleCnRewrite || !hasGCnRewrite) failed = true;

const mitm = new Map();
for (const raw of section('MITM').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const eq = line.indexOf('=');
  if (eq === -1) continue;
  mitm.set(line.slice(0, eq).trim(), line.slice(eq + 1).trim());
}
const mitmHosts = (mitm.get('hostname') || '').split(',').map(item => item.trim());
const mitmReady = mitm.get('enable') === 'true' && mitmHosts.includes('*.google.cn');
console.log('Google CN MITM base: ' + (mitmReady ? 'present' : 'missing'));
if (!mitmReady) failed = true;

if (failed) {
  console.error('FAIL: local WestData configuration is not fully compatible with the current Shadowrocket assumptions');
  process.exit(1);
}

console.log('PASS: local WestData configuration matches current Shadowrocket assumptions');
