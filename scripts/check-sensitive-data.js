const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const self = path.relative(root, __filename).replace(/\\/g, '/');

const files = execFileSync('git', ['ls-files', '-z'], { cwd: root })
  .toString('utf8')
  .split('\0')
  .filter(Boolean)
  .filter(file => file !== self);

const patterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['proxy URI', /\b(?:ss|ssr|vmess|vless|trojan|hysteria2?|tuic):\/\/[^\s"'<>]+/i],
  ['credentialed URL', /https?:\/\/[^\s/:]+:[^\s/@]+@[^\s"'<>]+/i],
  ['secret query parameter', /[?&](?:token|access_token|auth|key|api_key|secret|password|passwd|uuid)=[^&\s"'<>]{6,}/i],
  ['GitHub token', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['OpenAI-style key', /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/],
  ['UUID credential', /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i],
  ['authorization header', /\bAuthorization\s*:\s*(?:Bearer|Basic)\s+[A-Za-z0-9+/_=.-]{8,}/i],
  ['credential assignment', /\b(?:password|passwd|secret|token|api[_-]?key)\s*[:=]\s*["']?[^\s"',}]{8,}/i]
];

const allowLine = line =>
  /test-only|example\.invalid|placeholder|changeme|YOUR_[A-Z0-9_]+|<[^>]+>/.test(line);

const findings = [];
for (const file of files) {
  const full = path.join(root, file);
  let stat;
  try {
    stat = fs.statSync(full);
  } catch {
    continue;
  }
  if (!stat.isFile() || stat.size > 2 * 1024 * 1024) continue;

  let text;
  try {
    text = fs.readFileSync(full, 'utf8');
  } catch {
    continue;
  }
  if (text.includes('\u0000')) continue;

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (allowLine(lines[i])) continue;
    for (const [label, pattern] of patterns) {
      pattern.lastIndex = 0;
      if (pattern.test(lines[i])) findings.push({ file, line: i + 1, label });
    }
  }
}

if (findings.length) {
  for (const item of findings) {
    console.error('FAIL: possible ' + item.label + ' in ' + item.file + ':' + item.line);
  }
  process.exit(1);
}

console.log('PASS: no obvious credentials in tracked current-tree files');
