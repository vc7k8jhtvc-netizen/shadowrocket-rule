const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const text = fs.readFileSync(path.join(root, 'Advertising.MITM.Shadowrocket.sgmodule'), 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const expectedHosts = [
  '*.beacon.qq.com','*.gdt.qq.com','*.l.qq.com','ad*.sina.com','ad*.sina.com.cn','app.58.com',
  'cdn-1rtb.caiyunapp.com','d*.sinaimg.cn','goblin.hupu.com','sa*.tuisong.baidu.com','sax*.sina.com.cn','update.pan.baidu.com'
];
const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
const hostnameLines = lines.filter(line => line.startsWith('hostname = '));
assert(/^#!name=Advertising MITM \(12\)$/m.test(text), 'Advertising MITM module metadata drift');
assert(hostnameLines.length === 1, 'Advertising MITM module must contain one hostname line');
const hosts = hostnameLines[0].slice('hostname = '.length).split(',').map(host => host.trim()).filter(Boolean);
assert(JSON.stringify(hosts) === JSON.stringify(expectedHosts), 'Advertising MITM hostname list drift');
assert(!text.includes('%APPEND%'), 'Advertising MITM module must remain independently installable');
assert(!/\b(?:ca-passphrase|ca-p12)\s*=/.test(text), 'Advertising MITM module must not contain CA material');
assert(!/\[(?:General|Proxy|Rule|URL Rewrite|Script)\]/.test(text), 'Advertising MITM module must only provide MITM scope');
console.log('PASS: Advertising MITM module scope and CA safety checks');
