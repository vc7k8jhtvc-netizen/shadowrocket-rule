const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const routing = fs.readFileSync(path.join(root, 'Shadowrocket_Routing.conf'), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
function section(text, name) {
  const escaped = name.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp('\\[' + escaped + '\\]\\s*\\n([\\s\\S]*?)(?=\\n\\[[^\\]]+\\]|$)'));
  assert(match, 'missing [' + name + '] section');
  return match[1];
}
function activeLines(text) { return text.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#')); }

const sections = [...routing.matchAll(/^\[([^\]]+)\]$/gm)].map(match => match[1]);
assert(JSON.stringify(sections) === JSON.stringify(['General','Proxy Group','Rule']), 'unexpected routing sections');
assert(JSON.stringify(activeLines(section(routing,'General'))) === JSON.stringify(['include = WestData.conf']), 'General must only include WestData.conf');

const groupLines = activeLines(section(routing,'Proxy Group'));
const groups = new Map();
for (const line of groupLines) {
  const eq=line.indexOf('='); assert(eq!==-1,'invalid proxy group line');
  const name=line.slice(0,eq).trim(); const parts=line.slice(eq+1).split(',').map(x=>x.trim());
  groups.set(name,parts.slice(1));
}
const expectedGroups=['🚀 默认代理','🌍 国际兜底','👆 手动选择','🤖 AI','🍎 Apple','🔎 Google','💻 GitHub','🪟 Microsoft','📱 社交媒体','▶️ YouTube','✈️ Telegram','🛑 广告拦截','🇭🇰 香港','🏝️ 台湾','🇸🇬 新加坡','🇯🇵 日本','🇺🇸 美国'];
assert(JSON.stringify([...groups.keys()])===JSON.stringify(expectedGroups),'proxy group display order changed unexpectedly');

const rules=activeLines(section(routing,'Rule'));
assert(new Set(rules).size===rules.length,'duplicate Shadowrocket rules detected');
assert(!rules.some(rule=>rule.startsWith('FINAL,')),'Shadowrocket FINAL must not be used');

const deepseek='DOMAIN-SUFFIX,deepseek.com,DIRECT';
const ai='DOMAIN-SUFFIX,chatgpt.com,🤖 AI';
assert(rules.includes(deepseek),'DeepSeek DIRECT rule missing');
assert(rules.indexOf(deepseek)<rules.indexOf(ai),'DeepSeek DIRECT must precede proxied AI rules');

const terminal=[
  'DOMAIN-WILDCARD,*,🌍 国际兜底',
  'IP-CIDR,0.0.0.0/0,🌍 国际兜底,no-resolve',
  'IP-CIDR,::/0,🌍 国际兜底,no-resolve'
];
assert(JSON.stringify(rules.slice(-3))===JSON.stringify(terminal),'explicit terminal rules must be the final three Shadowrocket rules');
assert(rules.indexOf(deepseek)<rules.indexOf(terminal[0]),'DeepSeek DIRECT must precede international fallback');

console.log('PASS: Shadowrocket routing checks');
