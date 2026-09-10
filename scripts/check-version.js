const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fail = message => {
  console.error('FAIL: ' + message);
  process.exit(1);
};

function extractExactly(text, pattern, label) {
  const matches = [...text.matchAll(pattern)].map(match => match[1]);
  if (matches.length !== 1) {
    fail(label + ' must contain exactly one current version');
  }
  return matches[0];
}

function extractFirst(text, pattern, label) {
  const match = pattern.exec(text);
  if (!match) fail(label + ' must contain a current version');
  return match[1];
}

const routingVersion = extractExactly(
  read('Shadowrocket_Routing.conf'),
  /^# 版本：(v\d+\.\d+\.\d+)$/gm,
  'Routing config'
);
const readmeVersion = extractExactly(
  read('README.md'),
  /内部版本为\s+`(v\d+\.\d+\.\d+)`/g,
  'README'
);

const changelogSections = read('CHANGELOG.md').split(/^## /m).slice(1);
if (!changelogSections.length) fail('CHANGELOG has no dated section');
const changelogVersion = extractFirst(
  changelogSections[0],
  /内部版本(?:升至|为)\s+`(v\d+\.\d+\.\d+)`/g,
  'current CHANGELOG section'
);

const versions = [routingVersion, readmeVersion, changelogVersion];
if (new Set(versions).size !== 1) {
  fail('version mismatch: Routing=' + routingVersion +
    ', README=' + readmeVersion + ', CHANGELOG=' + changelogVersion);
}

console.log('PASS: version consistency (' + routingVersion + ')');
