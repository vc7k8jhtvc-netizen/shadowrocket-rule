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

// WestData.conf is a provider-owned, read-only subscription artifact. Validate only
// the integration contract this project actually depends on; do not pin provider
// implementation details such as General/Host/URL Rewrite/MITM contents.
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

const informationalPattern = /流量|剩余|traffic|quota|到期|expire|expiry|有效期/i;
const compatibleNames = names.filter(name => allPattern.test(name));
const informationalNames = names.filter(name => !allPattern.test(name) && informationalPattern.test(name));
const unexpectedNames = names.filter(name => !allPattern.test(name) && !informationalPattern.test(name));
const duplicateNames = [...new Set(names.filter((name, index) => names.indexOf(name) !== index))];

console.log('WestData local compatibility check');
console.log('Provider-owned subscription: validating project integration contract only');
console.log('Proxy entries: ' + names.length);
console.log('Compatible with all-node filter: ' + compatibleNames.length);
console.log('Ignored informational entries: ' + informationalNames.length);
console.log('Unexpected incompatible entries: ' + unexpectedNames.length);
console.log('Duplicate proxy names: ' + duplicateNames.length);

let failed = unexpectedNames.length !== 0 || duplicateNames.length !== 0;
for (const [region, pattern] of Object.entries(regions)) {
  const count = names.filter(name => pattern.test(name)).length;
  console.log(region + ': ' + count);
  if (count === 0) failed = true;
}

if (failed) {
  console.error('FAIL: WestData subscription no longer satisfies the node-selection contract used by this project');
  process.exit(1);
}

console.log('PASS: WestData subscription satisfies the current node-selection contract');
