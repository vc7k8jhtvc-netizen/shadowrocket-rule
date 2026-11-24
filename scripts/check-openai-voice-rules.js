#!/usr/bin/env node
'use strict';

const fs = require('fs');
const net = require('net');
const path = require('path');

const root = path.resolve(__dirname, '..');
const filePath = path.join(root, 'OpenAI_Voice.list');
const sourceUrl = 'https://openai.com/chatgpt-voice.json';
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(fs.existsSync(filePath), 'OpenAI_Voice.list is missing');
const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
assert(!content.includes('\r'), 'OpenAI_Voice.list has invalid line endings');
assert(content.endsWith('\n'), 'OpenAI_Voice.list must end with a newline');
assert(content.split('\n')[1] === '# Source: ' + sourceUrl, 'OpenAI_Voice.list source header drift');
const headers = content.split('\n').filter(line => line.startsWith('# '));
assert(headers.some(line => line.startsWith('# Creation-Time: ')), 'OpenAI_Voice.list creation time header missing');
const statedCount = Number((headers.find(line => line.startsWith('# Prefixes: ')) || '').slice('# Prefixes: '.length));
const active = content.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
assert(active.length > 0, 'OpenAI_Voice.list must not be empty');
assert(active.length <= 10000, 'OpenAI_Voice.list is unexpectedly large');
assert(Number.isInteger(statedCount) && statedCount === active.length, 'OpenAI_Voice.list prefix count header drift');
function canonicalIpKey(address, family) {
  if (family === 4) return '4:' + address;
  let normalized = address.toLowerCase();
  if (normalized.includes('.')) {
    const lastColon = normalized.lastIndexOf(':');
    const parts = normalized.slice(lastColon + 1).split('.').map(Number);
    normalized = normalized.slice(0, lastColon + 1)
      + ((parts[0] << 8) | parts[1]).toString(16) + ':'
      + ((parts[2] << 8) | parts[3]).toString(16);
  }
  const halves = normalized.split('::');
  assert(halves.length <= 2, 'invalid IPv6 address: ' + address);
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - left.length - right.length;
  assert(halves.length === 2 ? missing >= 0 : missing === 0, 'invalid IPv6 address: ' + address);
  const groups = halves.length === 2 ? [...left, ...Array(missing).fill('0'), ...right] : left;
  return '6:' + groups.reduce((value, group) => (value << 16n) + BigInt(parseInt(group, 16)), 0n).toString(16);
}
const seen = new Set();
for (const line of active) {
  const match = line.match(/^(IP-CIDR|IP-CIDR6),([^,\s]+),no-resolve$/);
  assert(match, 'unsupported OpenAI voice rule: ' + line);
  const type = match[1];
  const cidr = match[2];
  const cidrMatch = cidr.match(/^(.+)\/(\d{1,3})$/);
  assert(cidrMatch, 'invalid CIDR: ' + cidr);
  const family = net.isIP(cidrMatch[1]);
  const expectedPrefix = type === 'IP-CIDR' ? '32' : '128';
  assert(family === (type === 'IP-CIDR' ? 4 : 6), 'CIDR family mismatch: ' + line);
  assert(cidrMatch[2] === expectedPrefix, 'ChatGPT Voice rules must be host routes: ' + line);
  const key = canonicalIpKey(cidrMatch[1], family);
  assert(!seen.has(key), 'duplicate OpenAI voice rule: ' + line);
  seen.add(key);
}
const counts = {
  ipv4: active.filter(line => line.startsWith('IP-CIDR,')).length,
  ipv6: active.filter(line => line.startsWith('IP-CIDR6,')).length
};
console.log(`PASS: OpenAI voice rules (${counts.ipv4} IPv4, ${counts.ipv6} IPv6, no-resolve)`);
