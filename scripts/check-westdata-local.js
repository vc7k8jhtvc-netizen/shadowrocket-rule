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

const matchedAll = names.filter(name => allPattern.test(name)).length;
console.log('WestData local compatibility check');
console.log('Proxy entries: ' + names.length);
console.log('Compatible with all-node filter: ' + matchedAll + '/' + names.length);

let failed = matchedAll !== names.length;
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

if (failed) {
  console.error('FAIL: local WestData configuration is not fully compatible with the current Shadowrocket assumptions');
  process.exit(1);
}

console.log('PASS: local WestData configuration matches current Shadowrocket assumptions');
