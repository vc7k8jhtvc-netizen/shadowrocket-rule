const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const text = fs.readFileSync(path.join(root, 'YouTube.Enhance.Shadowrocket.sgmodule'), 'utf8');
const config = fs.readFileSync(path.join(root, 'Shadowrocket_Standalone_v2.6.5.conf'), 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error(message); };
function section(name) {
  const start = text.indexOf('[' + name + ']');
  assert(start !== -1, 'missing section: ' + name);
  return text.slice(start + name.length + 2).split(/\n\[/)[0]
    .split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
}

const rules = section('Rule');
assert(rules.includes('DOMAIN,init-stream.maasea.workers.dev,▶️ YouTube'), 'Worker must follow YouTube policy');
assert(!rules.some(rule => rule.startsWith('DOMAIN-SUFFIX,workers.dev,')), 'Worker policy must not cover shared workers.dev');
assert(config.split(/\r?\n/).some(line => line.startsWith('▶️ YouTube = select,')), 'Worker policy group missing');
for (const rule of [
  'AND,((DOMAIN-SUFFIX,googlevideo.com),(PROTOCOL,UDP)),REJECT',
  'AND,((DOMAIN,youtubei.googleapis.com),(PROTOCOL,UDP)),REJECT'
]) assert(rules.includes(rule), 'YouTube QUIC restriction missing');

const scripts = section('Script');
assert(scripts.length === 3, 'expected three YouTube script hooks');
const pin = '65075cdb388fc5e3094afd7e7314c67b243f3525';
const cases = [
  ['youtube.response', 'http-response', 'youtube.response.js', 'https://youtubei.googleapis.com/youtubei/v1/player?key=test'],
  ['youtube.request.init', 'http-request', 'youtube.request.js', 'https://rr1---test.googlevideo.com/initplayback?foo=1&ack=1'],
  ['youtube.request.log_event', 'http-request', 'youtube.request.js', 'https://youtubei.googleapis.com/youtubei/v1/log_event?key=test']
];
for (const [name, type, file, sample] of cases) {
  const line = scripts.find(item => item.startsWith(name + ' = '));
  assert(line && line.includes('type=' + type + ','), 'missing hook: ' + name);
  const url = line.match(/script-path=([^,]+)/)?.[1];
  assert(url === 'https://raw.githubusercontent.com/Maasea/sgmodule/' + pin + '/Script/Youtube/' + file, 'unexpected upstream script');
  for (const field of ['requires-body=1', 'max-size=-1', 'binary-body-mode=1']) assert(line.includes(field), 'missing body option');
  const pattern = new RegExp(line.match(/pattern=(.*?),requires-body=/)[1]);
  assert(pattern.test(sample), 'hook does not match expected endpoint');
  assert(!pattern.test('https://example.invalid/youtubei/v1/player'), 'hook matches unrelated host');
  const argument = line.match(/,argument="(.*)"$/);
  if (argument) assert(JSON.parse(argument[1]).captionLang === 'off', 'caption default changed');
}
assert(JSON.stringify(section('MITM')) === JSON.stringify(['hostname = %APPEND% *.googlevideo.com, youtubei.googleapis.com']), 'unexpected MITM scope');
console.log('PASS: YouTube module routing, pinned hooks and MITM scope (not device playback)');
