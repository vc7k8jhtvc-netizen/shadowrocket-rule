// Negative fixtures verify that validators reject invalid input, not only today's valid config.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'validator-check-'));
const assert = (ok, message) => { if (!ok) throw new Error(message); };
function check(script, args, expected, diagnostic) {
  const result = spawnSync(process.execPath, [path.join(temp, 'scripts', script), ...args], { encoding: 'utf8', timeout: 10000 });
  assert(result.status === expected, script + ': unexpected validation result');
  if (diagnostic) assert((result.stdout + result.stderr).includes(diagnostic), script + ': expected rejection missing');
}
try {
  fs.mkdirSync(path.join(temp, 'scripts'));
  for (const file of [
    'scripts/check-shadowrocket-routing.js', 'scripts/check-dual-client.js',
    'scripts/check-westdata-local.js',
    'scripts/check-sensitive-data.js', 'scripts/check-version.js',
    'Shadowrocket_Routing.conf', 'Clash_Verge_Rev_Script.js',
    'README.md', 'CHANGELOG.md'
  ]) fs.copyFileSync(path.join(root, file), path.join(temp, file));
  const routingPath = path.join(temp, 'Shadowrocket_Routing.conf');
  const routing = fs.readFileSync(routingPath, 'utf8');
  check('check-shadowrocket-routing.js', [], 0);
  check('check-version.js', [], 0);

  fs.writeFileSync(routingPath, routing.replace('DOMAIN-SUFFIX,deepseek.com,DIRECT\n', ''));
  check('check-shadowrocket-routing.js', [], 1, 'DeepSeek DIRECT rule missing');
  fs.writeFileSync(routingPath, routing.replace('🐟 漏网之鱼 = select,🚀 默认代理,DIRECT,', '🐟 漏网之鱼 = select,🚀 默认代理,'));
  check('check-shadowrocket-routing.js', [], 1, 'fallback group must include DIRECT');
  fs.writeFileSync(routingPath, routing.replace('DOMAIN-WILDCARD,*,🐟 漏网之鱼\n', ''));
  check('check-shadowrocket-routing.js', [], 1, 'explicit terminal rules');
  fs.writeFileSync(routingPath, routing.replace('IP-CIDR,0.0.0.0/0,🐟 漏网之鱼,no-resolve', 'FINAL,🐟 漏网之鱼'));
  check('check-shadowrocket-routing.js', [], 1, 'FINAL must not be used');
  fs.writeFileSync(routingPath, routing);

  const readmePath = path.join(temp, 'README.md');
  const readme = fs.readFileSync(readmePath, 'utf8');
  fs.writeFileSync(readmePath, readme.replace('内部版本为 `v2.7.14`', '内部版本为 `v9.9.9`'));
  check('check-version.js', [], 1, 'version mismatch');
  fs.writeFileSync(readmePath, readme);
  const changelogPath = path.join(temp, 'CHANGELOG.md');
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  fs.writeFileSync(changelogPath, changelog.replace('内部版本升至 `v2.7.14`', '内部版本升至 `v9.9.9`'));
  check('check-version.js', [], 1, 'version mismatch');
  fs.writeFileSync(changelogPath, changelog);
  const clashPath = path.join(temp, 'Clash_Verge_Rev_Script.js');
  const clashSource = fs.readFileSync(clashPath, 'utf8');
  check('check-dual-client.js', [], 0);
  fs.writeFileSync(clashPath, clashSource.replace('hk: /^.*Hong Kong \\| .+$/', 'hk: /^.*HK \\| .+$/'));
  check('check-dual-client.js', [], 1, 'node filter drift');
  fs.writeFileSync(clashPath, clashSource.replace("'DOMAIN-SUFFIX,deepseek.com,DIRECT',\n", ''));
  check('check-dual-client.js', [], 1, 'Clash missing direct rule');
  fs.writeFileSync(clashPath, clashSource);
  const pool = '👆 手动选择 = select,';
  for (const [member, diagnostic] of [['missing-policy','missing policy'],['👆 手动选择','cycle detected']]) {
    fs.writeFileSync(routingPath, routing.replace(pool, pool + member + ','));
    check('check-shadowrocket-routing.js', [], 1, diagnostic);
  }
  fs.writeFileSync(routingPath, routing.replace(pool, pool + '🇭🇰 香港,').replace('🇭🇰 香港 = select,', '🇭🇰 香港 = select,👆 手动选择,'));
  check('check-shadowrocket-routing.js', [], 1, 'cycle detected');
  fs.writeFileSync(routingPath, routing + '\n'); check('check-shadowrocket-routing.js', [], 0);
  const basePath = path.join(temp, 'base.conf');
  const base = '[General]\nuse-local-host-item-for-proxy = true\n[Proxy]\n' + ['Hong Kong','Taiwan','Singapore','Japan','United States'].map(region => region + ' | Fixture = ss,127.0.0.1,1,password=test-only').join('\n') + '\n[Host]\ncos-ap-beijing.toshiba-asdf.com = cos-ap-beijing.micron-asdf.com\noss-cn-guangzhou.toshiba-asdf.com = oss-cn-guangzhou.micron-asdf.com\noss-cn-shanghai.toshiba-asdf.com = oss-cn-shanghai.micron-asdf.com\n';
  const valid = '^https?://(www.)?g.cn($|/.*) https://www.google.com$2 302\n^https?://(www.)?google.cn($|/.*) https://www.google.com$2 302';
  function writeBase(rewrite) { fs.writeFileSync(basePath, base + '[URL Rewrite]\n' + rewrite + '\n[MITM]\nenable = true\nhostname = *.google.cn\n'); }
  writeBase(valid); check('check-westdata-local.js', [basePath], 0);
  for (const invalid of ['invalid google.cn google.com\ninvalid g.cn google.com',valid.replace('^https?','[https?'),valid.replace(/302/g,'999'),valid.replace(/www.google.com/g,'www.google.com.example.invalid'),valid.replace(/\$2/g,''),valid.replace(/\^https\?/g,'^http'),'^https?://.* https://example.invalid 302\n'+valid]) { writeBase(invalid); check('check-westdata-local.js',[basePath],1,'Google CN rewrites: incomplete'); }
  execFileSync('git', ['init','-q',temp]);
  const candidate = path.join(temp,'candidate.sgmodule'); fs.writeFileSync(candidate,'[MITM]\n'); execFileSync('git',['-C',temp,'add','candidate.sgmodule','scripts/check-sensitive-data.js']);
  for (const field of ['ca-passphrase','ca-p12']) for (const value of ['AuditFixture9876','test-only','placeholder']) { fs.writeFileSync(candidate,'[MITM]\n'+field+' = '+value+'\n'); check('check-sensitive-data.js',[],1,'MITM CA material'); }
  fs.writeFileSync(candidate,'[MITM]\nca-passphrase =\nca-p12 = ""\n# ca-p12 = documentation\n'); check('check-sensitive-data.js',[],0);
  console.log('PASS: validator regressions reject fallback-option drift, DeepSeek drift, terminal-rule drift, missing/cyclic groups, invalid redirects and CA exports');
} finally { fs.rmSync(temp, { recursive:true, force:true }); }
