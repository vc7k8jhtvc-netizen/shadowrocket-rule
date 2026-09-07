const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const routingPath = path.join(root, 'Shadowrocket_Routing_v2.7.0.conf');
const standalonePath = path.join(root, 'Shadowrocket_Standalone_v2.6.5.conf');

const routing = fs.readFileSync(routingPath, 'utf8');
const standalone = fs.readFileSync(standalonePath, 'utf8');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

function section(text, name) {
  const escaped = name.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp('\\[' + escaped + '\\]\\s*\\n([\\s\\S]*?)(?=\\n\\[[^\\]]+\\]|$)'));
  assert(match, 'missing [' + name + '] section');
  return match[1];
}

function activeLines(text) {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

const sections = [...routing.matchAll(/^\[([^\]]+)\]$/gm)].map(match => match[1]);
assert(
  JSON.stringify(sections) === JSON.stringify(['General', 'Proxy Group', 'Rule']),
  'routing overlay must contain only [General], [Proxy Group] and [Rule]'
);

const general = activeLines(section(routing, 'General'));
assert(
  JSON.stringify(general) === JSON.stringify(['include = WestData.conf']),
  'routing overlay [General] must only include WestData.conf'
);

for (const forbidden of [
  '[Proxy]',
  '[Host]',
  '[URL Rewrite]',
  '[MITM]',
  '[Script]',
  'dns-server',
  'fallback-dns-server',
  'tun-excluded-routes',
  'skip-proxy',
  'use-local-host-item-for-proxy',
  'ca-passphrase',
  'ca-p12'
]) {
  assert(!routing.includes(forbidden), 'routing overlay must not own base setting: ' + forbidden);
}

const routingGroups = activeLines(section(routing, 'Proxy Group'));
const standaloneGroups = activeLines(section(standalone, 'Proxy Group'));
assert(
  JSON.stringify(routingGroups) === JSON.stringify(standaloneGroups),
  'routing overlay proxy groups drift from v2.6.5 routing baseline'
);

const routingRules = activeLines(section(routing, 'Rule'));
const standaloneRules = activeLines(section(standalone, 'Rule'));
assert(
  JSON.stringify(routingRules) === JSON.stringify(standaloneRules),
  'routing overlay rules drift from v2.6.5 routing baseline'
);
assert(routingRules[routingRules.length - 1] === 'FINAL,🐟 FINAL', 'routing overlay FINAL must remain last');

console.log('PASS: lightweight Shadowrocket routing overlay checks');
