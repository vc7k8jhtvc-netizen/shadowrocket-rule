// Negative fixtures verify that validators reject invalid input, not only today's valid config.
// The suite runs under both LF and CRLF: a Windows/macOS checkout must not silently skip fixtures.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const normalize = text => text.replace(/\r\n/g, '\n');

function runSuite(eol) {
  const label = eol === '\r\n' ? 'CRLF' : 'LF';
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'validator-check-'));
  const at = name => path.join(temp, name);
  const read = name => normalize(fs.readFileSync(at(name), 'utf8'));
  const write = (name, text) => fs.writeFileSync(at(name), eol === '\r\n' ? text.replace(/\n/g, '\r\n') : text);
  const mutate = (name, text, before, after) => {
    assert(typeof before === 'string' && text.includes(before), `${label}: fixture anchor missing in ${name}: ${before}`);
    const next = text.replace(before, after);
    assert(next !== text, `${label}: fixture mutation was not applied in ${name}`);
    return next;
  };
  const mutatePattern = (name, text, pattern, replacement) => {
    assert(pattern.test(text), `${label}: fixture pattern missing in ${name}: ${pattern}`);
    const next = text.replace(pattern, replacement);
    assert(next !== text, `${label}: fixture regex mutation was not applied in ${name}`);
    return next;
  };

  function check(script, args, expected, diagnostic) {
    const result = spawnSync(process.execPath, [path.join(temp, 'scripts', script), ...args], { encoding: 'utf8', timeout: 10000 });
    assert(result.status === expected, `${label}: ${script}: unexpected validation result\n${result.stdout}${result.stderr}`);
    if (diagnostic) assert((result.stdout + result.stderr).includes(diagnostic), `${label}: ${script}: expected rejection missing`);
  }

  try {
    fs.mkdirSync(path.join(temp, 'scripts'));
    // Derive fixtures from the tracked file list: a newly added checker or gate can
    // never be silently skipped by a hand-maintained list.
    const fixtures = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
      .split('\0').filter(Boolean);
    assert(fixtures.length > 0, `${label}: git ls-files returned no tracked files`);
    for (const file of fixtures) {
      fs.mkdirSync(path.dirname(at(file)), { recursive: true });
      fs.copyFileSync(path.join(root, file), at(file));
    }
    // Convert every fixture before the baseline pass, so the CRLF run validates all checkers, not only mutations.
    if (eol === '\r\n') for (const file of fixtures) write(file, read(file));

    let routing=read('Shadowrocket_Routing.conf');
    const custom=read('Custom.list');
    const readme=read('README.md');
    let changelog=read('CHANGELOG.md');
    let clash=read('Clash_Verge_Rev_Script.js');

    check('check-shadowrocket-routing.js',[],0);
    check('check-dual-client.js',[],0);
    check('check-clash-script.js',[at('Clash_Verge_Rev_Script.js')],0);
    check('check-claude-routing.js',[],0);
    check('check-youtube-module.js',[],0);
    check('check-version.js',[],0);

    // All JS checkers and shell gates must stay syntactically valid in both EOL modes,
    // including those the local gate checks but never executes.
    // JS tolerates CRLF; Linux bash does not (which is why .gitattributes pins eol=lf).
    // In the CRLF suite, syntax-check a normalized LF copy of each shell gate so the
    // check covers file content on both EOL modes without pretending CRLF scripts run.
    const jsFiles=fixtures.filter(file=>file.endsWith('.js'));
    const shFiles=fixtures.filter(file=>file.endsWith('.sh'));
    assert(jsFiles.length>=12,`${label}: expected at least 12 JS fixtures, got ${jsFiles.length}`);
    assert(shFiles.length>=3,`${label}: expected at least 3 shell fixtures, got ${shFiles.length}`);
    for(const file of jsFiles){
      const result=spawnSync(process.execPath,['--check',at(file)],{encoding:'utf8',timeout:10000});
      assert(result.status===0,`${label}: node --check failed for ${file}\n${result.stdout}${result.stderr}`);
    }
    for(const file of shFiles){
      let target=at(file);
      if(eol==='\r\n'){
        target=at(file+'.lf');
        fs.writeFileSync(target,read(file));
        assert(!fs.readFileSync(target,'utf8').includes('\r'),`${label}: shell fixture not normalized: ${file}`);
      }
      const result=spawnSync('bash',['-n',target],{encoding:'utf8',timeout:10000});
      assert(result.status===0,`${label}: bash -n failed for ${file}\n${result.stdout}${result.stderr}`);
    }

    // CI-only checkers cannot execute here (Mihomo binary) and the local gate would
    // recurse into this suite. Guard their safety nets at source level instead.
    const runtimeChecker=read('scripts/check-mihomo-runtime.js');
    for(const marker of [
      'empty filtered group is not blocked',
      'LAN unexpectedly triggered DNS before domain routing',
      'Mihomo subscription dependency validation failed'
    ]) assert(runtimeChecker.includes(marker),`${label}: Mihomo runtime checker lost assertion: ${marker}`);
    const gate=read('scripts/check-config.sh');
    for(const marker of ['"$root"/scripts/*.js','node --check "$js_file"','[[ -f "$mihomo_check" ]]'])
      assert(gate.includes(marker),`${label}: check-config.sh lost M4 guard: ${marker}`);

    let youtubeModule=read('YouTube.Enhance.Shadowrocket.sgmodule');
    write('YouTube.Enhance.Shadowrocket.sgmodule',mutate('YouTube.Enhance.Shadowrocket.sgmodule',youtubeModule,'youtubei.googleapis.com\n','youtubei.googleapis.com, *.beacon.qq.com\n'));
    check('check-youtube-module.js',[],1,'unexpected YouTube-only MITM scope');
    write('YouTube.Enhance.Shadowrocket.sgmodule',youtubeModule);

    for(const hook of ['youtube.response','youtube.request.init']){
      const missingArguments=youtubeModule.split('\n').map(line=>line.startsWith(hook+' = ')?line.replace(/,argument=.*$/,''):line).join('\n');
      assert(missingArguments!==youtubeModule,hook+': fixture anchor missing');
      write('YouTube.Enhance.Shadowrocket.sgmodule',missingArguments);
      check('check-youtube-module.js',[],1,'missing arguments: '+hook);
    }
    write('YouTube.Enhance.Shadowrocket.sgmodule',mutate('YouTube.Enhance.Shadowrocket.sgmodule',youtubeModule,'"blockShorts":true','"blockShorts":false'));
    check('check-youtube-module.js',[],1,'Shorts blocking must be enabled');
    write('YouTube.Enhance.Shadowrocket.sgmodule',youtubeModule);

    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'RULE-SET,https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Custom.list,🧩 自定义\n',''));
    check('check-shadowrocket-routing.js',[],1,'Custom.list routing rule missing');
    write('Shadowrocket_Routing.conf',routing);

    // Reintroduction of either Advertising source or the old group must fail.
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'[Rule]\n','[Rule]\nRULE-SET,https://example.invalid/Advertising.list,DIRECT\n'));
    check('check-shadowrocket-routing.js',[],1,'legacy Advertising routing rule must be absent');
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'# 功能分组\n','# 功能分组\n🛑 广告拦截 = select,REJECT,DIRECT,select=0\n'));
    check('check-shadowrocket-routing.js',[],1,'proxy group display order');
    write('Shadowrocket_Routing.conf',routing);

    // Claude rules must be complete, use the AI policy, and preserve ordering.
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'DOMAIN-SUFFIX,claudeusercontent.com,🤖 AI\n',''));
    check('check-claude-routing.js',[],1,'Claude rules must match exact dedicated-domain list');
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'DOMAIN-SUFFIX,claude.ai,🤖 AI','DOMAIN-SUFFIX,claude.ai,DIRECT'));
    check('check-claude-routing.js',[],1,'Claude rules must match exact dedicated-domain list');
    write('Shadowrocket_Routing.conf',routing);

    // Personal AI relay rules are explicit exceptions and must not silently disappear.
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'DOMAIN-SUFFIX,a6api.vip,🤖 AI\n',''));
    check('check-dual-client.js',[],1,'AI manual rules drift between clients');
    write('Shadowrocket_Routing.conf',routing);
    write('Clash_Verge_Rev_Script.js',mutate('Clash_Verge_Rev_Script.js',clash,"'DOMAIN-SUFFIX,a6api.com,🤖 AI'","'DOMAIN-SUFFIX,a6api.com,DIRECT'"));
    check('check-dual-client.js',[],1,'AI manual rules drift between clients');
    write('Clash_Verge_Rev_Script.js',clash);

    // The hardening checker itself must reject drift; parity checks alone would not
    // notice a weakened hardening assertion.
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'DOMAIN-SUFFIX,a6api.vip,🤖 AI\n',''));
    check('check-routing-hardening.js',[],1,'personal AI relay rule');
    write('Shadowrocket_Routing.conf',routing);

    write('Custom.list',custom+'DOMAIN-SUFFIX,wikipedia.org\n');
    check('check-shadowrocket-routing.js',[],1,'duplicate Custom.list entry');
    write('Custom.list',custom+'INVALID,example.com\n');
    check('check-shadowrocket-routing.js',[],1,'unsupported Custom.list rule syntax');
    write('Custom.list',custom);

    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'🐟 漏网之鱼 = select,🚀 默认代理,DIRECT,','🐟 漏网之鱼 = select,🚀 默认代理,'));
    check('check-shadowrocket-routing.js',[],1,'fallback group must include DIRECT');
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'DOMAIN-WILDCARD,*,🐟 漏网之鱼\n',''));
    check('check-shadowrocket-routing.js',[],1,'explicit terminal rules');
    write('Shadowrocket_Routing.conf',routing);

    write('README.md',mutatePattern('README.md',readme,/内部版本为 `v\d+\.\d+\.\d+`/,'内部版本为 `v9.9.9`'));
    check('check-version.js',[],1,'version mismatch');
    write('README.md',readme);

    write('CHANGELOG.md',mutatePattern('CHANGELOG.md',changelog,/内部版本(?:升至|为) `v\d+\.\d+\.\d+`/,'内部版本为 `v9.9.9`'));
    check('check-version.js',[],1,'version mismatch');
    write('CHANGELOG.md',changelog);

    write('Clash_Verge_Rev_Script.js',mutate('Clash_Verge_Rev_Script.js',clash,"url: `${blackmatrix}/Clash/China/China_Domain.txt`","url: `${blackmatrix}/Shadowrocket/China/China_Domain.list`"));
    check('check-clash-script.js',[at('Clash_Verge_Rev_Script.js')],1,'China domain rule-provider source');
    write('Clash_Verge_Rev_Script.js',mutate('Clash_Verge_Rev_Script.js',clash,"'GEOIP,CN,DIRECT',","'GEOIP,CN,DIRECT,no-resolve',"));
    check('check-clash-script.js',[at('Clash_Verge_Rev_Script.js')],1,'Clash GEOIP rule must not use no-resolve');
    write('Clash_Verge_Rev_Script.js',clash);
    write('Clash_Verge_Rev_Script.js',mutate('Clash_Verge_Rev_Script.js',clash,"'RULE-SET,Custom,🧩 自定义',\n",''));
    check('check-dual-client.js',[],1,'Clash Custom rule missing');
    write('Clash_Verge_Rev_Script.js',clash);
    write('Clash_Verge_Rev_Script.js',mutate('Clash_Verge_Rev_Script.js',clash,"    China: classicalProvider('China'),","    Advertising: classicalProvider('Advertising'),\n    China: classicalProvider('China'),"));
    check('check-clash-script.js',[at('Clash_Verge_Rev_Script.js')],1,'legacy Advertising providers must be absent');
    write('Clash_Verge_Rev_Script.js',clash);
    write('Clash_Verge_Rev_Script.js',mutate('Clash_Verge_Rev_Script.js',clash,"'DOMAIN-SUFFIX,anthropic.com,🤖 AI',",''));
    check('check-claude-routing.js',[],1,'Claude rules must match exact dedicated-domain list');
    write('Clash_Verge_Rev_Script.js',clash);

    const pool='👆 手动选择 = select,';
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,pool,pool+'missing-policy,'));
    check('check-shadowrocket-routing.js',[],1,'missing policy');
    write('Shadowrocket_Routing.conf',routing);

    const basePath=path.join(temp,'base.conf');
    const base='[General]\nuse-local-host-item-for-proxy = true\n[Proxy]\n'+['Hong Kong','Taiwan','Singapore','Japan','United States'].map(region=>region+' | Fixture = ss,127.0.0.1,1,password=test-only').join('\n')+'\n[Host]\ncos-ap-beijing.toshiba-asdf.com = cos-ap-beijing.micron-asdf.com\noss-cn-guangzhou.toshiba-asdf.com = oss-cn-guangzhou.micron-asdf.com\noss-cn-shanghai.toshiba-asdf.com = oss-cn-shanghai.micron-asdf.com\n';
    const valid='^https?://(www.)?g.cn($|/.*) https://www.google.com$2 302\n^https?://(www.)?google.cn($|/.*) https://www.google.com$2 302';
    fs.writeFileSync(basePath,base+'[URL Rewrite]\n'+valid+'\n[MITM]\nenable = true\nhostname = *.google.cn\n');
    check('check-westdata-local.js',[basePath],0);

    execFileSync('git',['init','-q',temp]);
    const candidate=path.join(temp,'candidate.sgmodule');
    fs.writeFileSync(candidate,'[MITM]\nca-passphrase = test-only\n');
    execFileSync('git',['-C',temp,'add','candidate.sgmodule','scripts/check-sensitive-data.js']);
    check('check-sensitive-data.js',[],1,'MITM CA material');

    // Build synthetic credentials in pieces so this test source contains no credential.
    const assignment='password'+'=';
    const synthetic='synthetic-review-'+'secret';
    for(const suffix of ['', ' # <note>', ' # placeholder', ' # test-only', ' # example.invalid']){
      fs.writeFileSync(candidate,assignment+synthetic+suffix+'\n');
      check('check-sensitive-data.js',[],1,'credential assignment');
    }
    fs.writeFileSync(candidate,assignment+'test-only, '+assignment+synthetic+'\n');
    check('check-sensitive-data.js',[],1,'credential assignment');
    const syntheticToken='ghp_'+'A'.repeat(24);
    fs.writeFileSync(candidate,syntheticToken+' # placeholder\n');
    check('check-sensitive-data.js',[],1,'GitHub token');
    fs.writeFileSync(candidate,assignment+'test-only\n'+assignment+'placeholder\n'+assignment+'YOUR_PASSWORD\n');
    check('check-sensitive-data.js',[],0);

    console.log(`PASS: validator regressions cover every tracked checker, EOL syntax, hardening and M4 guards (${label})`);
  }finally{
    fs.rmSync(temp,{recursive:true,force:true});
  }
}

runSuite('\n');
runSuite('\r\n');
console.log('PASS: validator regressions hold under both LF and CRLF checkouts');
