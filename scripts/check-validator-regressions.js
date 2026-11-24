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
    let fixtures;
    try {
      fixtures = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
        .split('\0').filter(Boolean);
    } catch {
      const skip = new Set(['.git', 'node_modules', 'private', '.private']);
      fixtures = [];
      const walk = current => {
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
          if (skip.has(entry.name)) continue;
          const full = path.join(current, entry.name);
          if (entry.isDirectory()) walk(full);
          else if (entry.isFile()) fixtures.push(path.relative(root, full).replace(/\\/g, '/'));
        }
      };
      walk(root);
      fixtures.sort();
    }
    assert(fixtures.length > 0, `${label}: git ls-files returned no tracked files`);
    for (const file of fixtures) {
      fs.mkdirSync(path.dirname(at(file)), { recursive: true });
      fs.copyFileSync(path.join(root, file), at(file));
    }
    // Convert every fixture before the baseline pass, so the CRLF run validates all checkers, not only mutations.
    if (eol === '\r\n') for (const file of fixtures) write(file, read(file));

    let routing=read('Shadowrocket_Routing.conf');
    const aiRules=read('rules/ai-rules.json');
    const custom=read('Custom.list');
    const adult=read('Adult.list');
    const readme=read('README.md');
    let changelog=read('CHANGELOG.md');
    let clash=read('Clash_Verge_Rev_Script.js');

    check('sync-ai-rules.js',['--check'],0);
    check('check-shadowrocket-routing.js',[],0);
    check('check-dual-client.js',[],0);
    check('check-clash-script.js',[at('Clash_Verge_Rev_Script.js')],0);
    check('check-claude-routing.js',[],0);
    check('check-openai-voice-rules.js',[],0);
    check('check-routing-hardening.js',[],0);
    check('check-youtube-module.js',[],0);
    check('check-version.js',[],0);

    // All JS checkers and shell gates must stay syntactically valid in both EOL modes,
    // including those the local gate checks but never executes.
    // JS tolerates CRLF; Linux bash does not (which is why .gitattributes pins eol=lf).
    // In the CRLF suite, syntax-check a normalized LF copy of each shell gate so the
    // check covers file content on both EOL modes without pretending CRLF scripts run.
    const jsFiles=fixtures.filter(file=>file.endsWith('.js'));
    const shFiles=fixtures.filter(file=>file.endsWith('.sh'));
    assert(jsFiles.length>=13,`${label}: expected at least 13 JS fixtures, got ${jsFiles.length}`);
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
      const shellParser=process.env.BASH_SYNTAX_CHECK;
      const result=shellParser
        ? spawnSync(shellParser,['-ln=bash',target],{encoding:'utf8',timeout:10000})
        : spawnSync('bash',['-n',target],{encoding:'utf8',timeout:10000});
      assert(result.status===0,label+': shell syntax check failed for '+file+'\n'+result.stdout+result.stderr);
    }

    // CI-only checkers cannot execute here (Mihomo binary) and the local gate would
    // recurse into this suite. Guard their safety nets at source level instead.
    const runtimeChecker=read('scripts/check-mihomo-runtime.js');
    for(const marker of [
      'empty filtered group is not blocked',
      'LAN unexpectedly triggered DNS before domain routing',
      'Mihomo subscription dependency validation failed',
      'Mihomo routing mismatch'
    ]) assert(runtimeChecker.includes(marker),`${label}: Mihomo runtime checker lost assertion: ${marker}`);
    const gate=read('scripts/check-config.sh');
    for(const marker of ['"$root"/scripts/*.js','node --check "$js_file"','[[ -f "$mihomo_check" ]]','node "$sync_ai_check" --check','node "$openai_voice_check"','bash "$external_test"'])
      assert(gate.includes(marker),`${label}: check-config.sh lost M4 guard: ${marker}`);

    // AI rules single-source-of-truth sync checks: drift, missing markers, invalid rules, conflicts, and write-mode recovery.
    write('rules/ai-rules.json',mutate('rules/ai-rules.json',aiRules,'"DOMAIN-SUFFIX,grok.me,🤖 AI",\n',''));
    check('sync-ai-rules.js',['--check'],1,'AI rules out of sync with rules/ai-rules.json');
    write('rules/ai-rules.json',mutate('rules/ai-rules.json',aiRules,'"DOMAIN-WILDCARD,*-aiplatform.googleapis.com,🤖 AI"','"DOMAIN-KEYWORD,-aiplatform.googleapis.com,🤖 AI"'));
    check('sync-ai-rules.js',['--check'],1,'unsupported AI rule syntax');
    write('rules/ai-rules.json',mutate('rules/ai-rules.json',aiRules,'"DOMAIN-SUFFIX,grok.me,🤖 AI"','"DOMAIN-SUFFIX,*.grok.me,🤖 AI"'));
    check('sync-ai-rules.js',['--check'],1,'unsupported AI rule syntax');
    write('rules/ai-rules.json',mutate('rules/ai-rules.json',aiRules,'"DOMAIN-SUFFIX,a6api.com,🤖 AI"','"DOMAIN-SUFFIX,a6api.vip,🤖 AI"'));
    check('sync-ai-rules.js',['--check'],1,'duplicate AI rule');
    write('rules/ai-rules.json',mutate('rules/ai-rules.json',aiRules,'"DOMAIN-SUFFIX,a6api.com,🤖 AI"','"DOMAIN-SUFFIX,a6api.vip,DIRECT"'));
    check('sync-ai-rules.js',['--check'],1,'conflicting AI rule policies');
    write('rules/ai-rules.json',aiRules);
    const voiceList=read('OpenAI_Voice.list');
    const voiceFirst=voiceList.split('\n').find(line=>line.startsWith('IP-CIDR,'));
    assert(voiceFirst,label+': OpenAI voice fixture has no IPv4 rule');
    write('OpenAI_Voice.list',mutate('OpenAI_Voice.list',voiceList,voiceFirst,'IP-CIDR,0.0.0.0/0,no-resolve'));
    check('check-openai-voice-rules.js',[],1,'host routes');
    write('OpenAI_Voice.list',mutate('OpenAI_Voice.list',voiceList,voiceFirst,voiceFirst.replace('/32,','/032,')));
    check('check-openai-voice-rules.js',[],1,'host routes');
    write('OpenAI_Voice.list',mutate('OpenAI_Voice.list',voiceList,voiceFirst,voiceFirst.replace(',no-resolve','')));
    check('check-openai-voice-rules.js',[],1,'unsupported OpenAI voice rule');
    write('OpenAI_Voice.list',voiceList);
    fs.writeFileSync(at('voice-bad.json'),'{"creationTime":"fixture","prefixes":[{"ipv4Prefix":"0.0.0.0/0"}]}');
    check('sync-openai-voice-rules.js',['--source',at('voice-bad.json')],1,'host routes');
    fs.writeFileSync(at('voice-v6.json'),'{"creationTime":"fixture","prefixes":[{"ipv4Prefix":"102.37.57.54/32"},{"ipv6Prefix":"2001:db8::1/128"}]}');
    check('sync-openai-voice-rules.js',['--source',at('voice-v6.json')],0);
    check('check-openai-voice-rules.js',[],0);
    write('OpenAI_Voice.list',voiceList);

    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'DOMAIN-SUFFIX,grok.me,🤖 AI\n',''));
    check('sync-ai-rules.js',['--check'],1,'Shadowrocket_Routing.conf');
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'# >>> BEGIN AI RULES (generated from rules/ai-rules.json; run `node scripts/sync-ai-rules.js`) >>>\n',''));
    check('sync-ai-rules.js',['--check'],1,'missing AI rules begin marker');
    write('Shadowrocket_Routing.conf',routing);
    write('Clash_Verge_Rev_Script.js',mutate('Clash_Verge_Rev_Script.js',clash,"    'DOMAIN-SUFFIX,grok.me,🤖 AI',\n",''));
    check('sync-ai-rules.js',['--check'],1,'Clash_Verge_Rev_Script.js');
    check('sync-ai-rules.js',[],0);
    check('sync-ai-rules.js',['--check'],0);
    write('Clash_Verge_Rev_Script.js',clash);

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
    write('YouTube.Enhance.Shadowrocket.sgmodule',mutate('YouTube.Enhance.Shadowrocket.sgmodule',youtubeModule,'/Maasea/sgmodule/master/','/Maasea/sgmodule/0123456789abcdef0123456789abcdef01234567/'));
    check('check-youtube-module.js',[],1,'unexpected upstream script');
    write('YouTube.Enhance.Shadowrocket.sgmodule',youtubeModule);

    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'RULE-SET,https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Custom.list,🧩 自定义\n',''));
    check('check-shadowrocket-routing.js',[],1,'Custom.list routing rule missing');
    write('Shadowrocket_Routing.conf',routing);

    // Reintroduction of either Advertising source or the old group must fail.
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'[Rule]\n','[Rule]\nRULE-SET,https://example.invalid/Advertising.list,DIRECT\n'));
    check('check-shadowrocket-routing.js',[],1,'legacy Advertising routing rule must be absent');
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'[Proxy Group]\n','[Proxy Group]\n🛑 广告拦截 = select,REJECT,DIRECT,select=0\n'));
    check('check-shadowrocket-routing.js',[],1,'proxy group display order');
    write('Shadowrocket_Routing.conf',routing);

    // Claude rules must be complete, use the AI policy, and preserve ordering.
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'DOMAIN-SUFFIX,claudeusercontent.com,🤖 AI\n',''));
    check('check-claude-routing.js',[],1,'Claude rules');
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'DOMAIN-SUFFIX,claude.ai,🤖 AI','DOMAIN-SUFFIX,claude.ai,DIRECT'));
    check('check-claude-routing.js',[],1,'Claude rules');
    write('Shadowrocket_Routing.conf',routing);

    // Gemini / Google AI rules must remain complete, scoped and consistent across clients.
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'DOMAIN-SUFFIX,aistudio.google.com,🤖 AI\n',''));
    check('check-routing-hardening.js',[],1,'missing Gemini/Google AI rule');
    write('Shadowrocket_Routing.conf',routing);
    write('Clash_Verge_Rev_Script.js',mutate('Clash_Verge_Rev_Script.js',clash,"'DOMAIN-SUFFIX,generativelanguage.googleapis.com,🤖 AI',","'DOMAIN-SUFFIX,generativelanguage.googleapis.com,DIRECT',"));
    check('check-routing-hardening.js',[],1,'missing Gemini/Google AI rule');
    write('Clash_Verge_Rev_Script.js',clash);
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'# Gemini / Google AI\n','# Gemini / Google AI\nDOMAIN-SUFFIX,www.googleapis.com,🤖 AI\n'));
    check('check-routing-hardening.js',[],1,'shared Google host must not be globally routed to AI');
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'# Gemini / Google AI\n','# Gemini / Google AI\nDOMAIN-SUFFIX,jnn-pa.googleapis.com,🤖 AI\n'));
    check('check-routing-hardening.js',[],1,'shared Google host must not be globally routed to AI');
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'# Gemini / Google AI\n','# Gemini / Google AI\nDOMAIN-SUFFIX,waa-pa.clients6.google.com,🤖 AI\n'));
    check('check-routing-hardening.js',[],1,'shared Google host must not be globally routed to AI');
    write('Shadowrocket_Routing.conf',routing);

    // v2.7.33: regional Vertex AI must stay anchored, shared Statsig CDN and mainland Canva stay out of AI.
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'DOMAIN-WILDCARD,*-aiplatform.googleapis.com,🤖 AI\n','DOMAIN-WILDCARD,*-aiplatform.googleapis.com,🤖 AI\nDOMAIN-KEYWORD,-aiplatform.googleapis.com,🤖 AI\n'));
    check('check-routing-hardening.js',[],1,'unanchored DOMAIN-KEYWORD');
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'DOMAIN-SUFFIX,grokipedia.com,🤖 AI\n','DOMAIN-SUFFIX,grokipedia.com,🤖 AI\nDOMAIN-SUFFIX,featureassets.org,🤖 AI\n'));
    check('check-routing-hardening.js',[],1,'must not globally force shared SaaS through AI');
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'DOMAIN-SUFFIX,canva.cn,DIRECT','DOMAIN-SUFFIX,canva.cn,🤖 AI'));
    check('check-routing-hardening.js',[],1,'Canva dedicated-domain rules must match exact DIRECT/AI list');
    write('Shadowrocket_Routing.conf',routing);

    // v2.7.33: Clash dependency retention for DNS #RULES, listeners/tunnels and sub-rules.
    write('Clash_Verge_Rev_Script.js',mutate('Clash_Verge_Rev_Script.js',clash,"    if (decodedProxy === 'RULES') return server;\n",''));
    check('check-routing-hardening.js',[],1,'不存在的策略');
    write('Clash_Verge_Rev_Script.js',mutate('Clash_Verge_Rev_Script.js',clash,"  if (tunnels) config.tunnels = tunnels;\n",''));
    check('check-routing-hardening.js',[],1,'tunnel proxy must map to the retained group');
    write('Clash_Verge_Rev_Script.js',mutate('Clash_Verge_Rev_Script.js',clash,"  delete config['sub-rules'];\n",''));
    check('check-routing-hardening.js',[],1,'orphaned sub-rules must be removed');
    write('Clash_Verge_Rev_Script.js',mutate('Clash_Verge_Rev_Script.js',clash,"  if (ntp !== undefined) config.ntp = ntp;\n",''));
    check('check-clash-script.js',[at('Clash_Verge_Rev_Script.js')],1,'ntp.dialer-proxy must map to retained group');
    write('Clash_Verge_Rev_Script.js',mutate('Clash_Verge_Rev_Script.js',clash,"      if (key === 'fake-ip-filter' && isFakeIpRuleMode && Array.isArray(value)) {\n        return [key, value.map(preserveFakeIpFilterRule)];\n      }\n",''));
    check('check-clash-script.js',[at('Clash_Verge_Rev_Script.js')],1,'rule-mode fake-ip-filter RULE-SET must map to retained rule-provider');
    write('Clash_Verge_Rev_Script.js',clash);

    // Personal AI relay rules are explicit exceptions and must not silently disappear.
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'DOMAIN-SUFFIX,a6api.vip,🤖 AI\n',''));
    check('check-dual-client.js',[],1,'AI manual rules drift between clients');
    write('Shadowrocket_Routing.conf',routing);
    write('Clash_Verge_Rev_Script.js',mutate('Clash_Verge_Rev_Script.js',clash,"'DOMAIN-SUFFIX,a6api.com,🤖 AI'","'DOMAIN-SUFFIX,a6api.com,DIRECT'"));
    check('check-dual-client.js',[],1,'AI manual rules drift between clients');
    write('Clash_Verge_Rev_Script.js',clash);

    // The hardening checker itself must reject drift and commented-out rules; parity checks
    // alone would not notice a weakened hardening assertion.
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'DOMAIN-SUFFIX,a6api.vip,🤖 AI\n',''));
    check('check-routing-hardening.js',[],1,'personal AI relay rule');
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'DOMAIN-SUFFIX,a6api.vip,🤖 AI\n','# DOMAIN-SUFFIX,a6api.vip,🤖 AI\n'));
    check('check-routing-hardening.js',[],1,'personal AI relay rule');
    write('Shadowrocket_Routing.conf',routing);

    // Exa / Tavily / Jina are AI search/reader services; deleting the explicit rule or returning
    // any of them to Custom.list must fail the hardening check.
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'DOMAIN-SUFFIX,exa.ai,🤖 AI\n',''));
    check('check-routing-hardening.js',[],1,'Exa/Tavily/Jina AI search rule');
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'DOMAIN-SUFFIX,jina.ai,🤖 AI\n',''));
    check('check-routing-hardening.js',[],1,'Exa/Tavily/Jina AI search rule');
    write('Shadowrocket_Routing.conf',routing);
    write('Custom.list',mutate('Custom.list',custom,'# ===== 开发工具 =====\n','DOMAIN-SUFFIX,exa.ai\n\n# ===== 开发工具 =====\n'));
    check('check-routing-hardening.js',[],1,'Exa/Tavily/Jina must not remain in Custom.list');
    write('Custom.list',mutate('Custom.list',custom,'# ===== 开发工具 =====\n','DOMAIN-SUFFIX,jina.ai\n\n# ===== 开发工具 =====\n'));
    check('check-routing-hardening.js',[],1,'Exa/Tavily/Jina must not remain in Custom.list');
    write('Custom.list',custom);

    // Direct mutations of rules/ai-rules.json must still trip independent security/policy redlines.
    write('rules/ai-rules.json',mutate('rules/ai-rules.json',aiRules,'"DOMAIN-SUFFIX,grokipedia.com,🤖 AI"','"DOMAIN-SUFFIX,grokipedia.com,🤖 AI",\n        "DOMAIN-SUFFIX,featureassets.org,🤖 AI"'));
    check('check-routing-hardening.js',[],1,'must not globally force shared SaaS through AI');
    write('rules/ai-rules.json',mutate('rules/ai-rules.json',aiRules,'"DOMAIN-SUFFIX,canva.cn,DIRECT"','"DOMAIN-SUFFIX,canva.cn,🤖 AI"'));
    check('check-routing-hardening.js',[],1,'Canva dedicated-domain rules');
    write('rules/ai-rules.json',mutate('rules/ai-rules.json',aiRules,'"DOMAIN-SUFFIX,a6api.com,🤖 AI"','"DOMAIN-SUFFIX,a6api.com,🤖 AI",\n        "DOMAIN-SUFFIX,extra-relay.example,🤖 AI"'));
    check('check-routing-hardening.js',[],1,'personal AI relay rule set');
    write('rules/ai-rules.json',aiRules);

    // Supabase / Hugging Face are explicit AI choices and must also stay outside Custom.list.
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'DOMAIN-SUFFIX,huggingface.co,🤖 AI\n',''));
    check('check-routing-hardening.js',[],1,'Supabase/HuggingFace AI platform rule');
    write('Shadowrocket_Routing.conf',routing);
    write('Custom.list',mutate('Custom.list',custom,'# ===== 开发工具 =====\n','DOMAIN-SUFFIX,supabase.in\n\n# ===== 开发工具 =====\n'));
    check('check-routing-hardening.js',[],1,'Supabase/HuggingFace must not remain in Custom.list');
    write('Custom.list',custom);

    // Canva rules are a dedicated AI application group and must not disappear or drift.
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'DOMAIN-SUFFIX,canvastatus.com,🤖 AI\n',''));
    check('check-routing-hardening.js',[],1,'Canva dedicated-domain rules');
    write('Shadowrocket_Routing.conf',routing);
    write('Clash_Verge_Rev_Script.js',mutate('Clash_Verge_Rev_Script.js',clash,"'DOMAIN-SUFFIX,canva.com,🤖 AI'","'DOMAIN-SUFFIX,canva.com,DIRECT'"));
    check('check-routing-hardening.js',[],1,'Canva dedicated-domain rules');
    write('Clash_Verge_Rev_Script.js',clash);

    write('Custom.list',custom+'DOMAIN-SUFFIX,wikipedia.org\n');
    check('check-shadowrocket-routing.js',[],1,'duplicate Custom.list entry');
    write('Custom.list',custom+'INVALID,example.com\n');
    check('check-shadowrocket-routing.js',[],1,'unsupported Custom.list rule syntax');
    write('Custom.list',custom+'DOMAIN-SUFFIX,https://example.com\n');
    check('check-shadowrocket-routing.js',[],1,'unsupported Custom.list rule syntax');
    write('Custom.list',custom+'DOMAIN-SUFFIX,openai.com\n');
    check('check-shadowrocket-routing.js',[],1,'overlapping rule between Custom.list and Shadowrocket_Routing.conf');
    write('Custom.list',custom);

    write('Adult.list',adult+'DOMAIN-SUFFIX,jable.tv\n');
    check('check-shadowrocket-routing.js',[],1,'duplicate Adult.list entry');
    write('Adult.list',adult+'INVALID,example.com\n');
    check('check-shadowrocket-routing.js',[],1,'unsupported Adult.list rule syntax');
    write('Adult.list',adult+'DOMAIN-SUFFIX,wikipedia.org\n');
    check('check-shadowrocket-routing.js',[],1,'overlapping rule between Custom.list and Adult.list');
    write('Adult.list',adult+'DOMAIN,en.wikipedia.org\n');
    check('check-shadowrocket-routing.js',[],1,'overlapping rule between Custom.list and Adult.list');
    write('Adult.list',adult);
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'RULE-SET,https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Adult.list,🔞 NSFW\n',''));
    check('check-shadowrocket-routing.js',[],1,'Adult.list routing rule missing');
    check('check-dual-client.js',[],1,'Shadowrocket Adult rule missing');
    write('Shadowrocket_Routing.conf',routing);
    write('Clash_Verge_Rev_Script.js',mutate('Clash_Verge_Rev_Script.js',clash,"'RULE-SET,Adult,🔞 NSFW,no-resolve',\n",''));
    check('check-dual-client.js',[],1,'Clash Adult rule missing');
    write('Clash_Verge_Rev_Script.js',clash);

    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'🐟 漏网之鱼 = select,🚀 默认代理,DIRECT,','🐟 漏网之鱼 = select,🚀 默认代理,'));
    check('check-shadowrocket-routing.js',[],1,'fallback group must include DIRECT');
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'DOMAIN-WILDCARD,*,🐟 漏网之鱼\n',''));
    check('check-shadowrocket-routing.js',[],1,'explicit terminal rules');
    // Comment containing [Rule] must not hijack anchored section() parsing (L3).
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'[General]\n','# note mentioning [Rule] in comment\n[General]\n'));
    check('check-shadowrocket-routing.js',[],0);
    check('check-dual-client.js',[],0);
    write('Shadowrocket_Routing.conf',routing);

    write('README.md',mutatePattern('README.md',readme,/内部版本为 `v\d+\.\d+\.\d+`/,'内部版本为 `v9.9.9`'));
    check('check-version.js',[],1,'version mismatch');
    write('README.md',readme);

    write('CHANGELOG.md',mutatePattern('CHANGELOG.md',changelog,/内部版本(?:升至|为) `v\d+\.\d+\.\d+`/,'内部版本为 `v9.9.9`'));
    check('check-version.js',[],1,'version mismatch');
    write('CHANGELOG.md',changelog);

    write('Clash_Verge_Rev_Script.js',mutatePattern('Clash_Verge_Rev_Script.js',clash,/const scriptVersion = 'v\d+\.\d+\.\d+';/,"const scriptVersion = 'v9.9.9';"));
    check('check-version.js',[],1,'version mismatch');
    write('Clash_Verge_Rev_Script.js',clash);

    write('Clash_Verge_Rev_Script.js',mutate('Clash_Verge_Rev_Script.js',clash,'url: `${blackmatrix}/Clash/${name}/${name}_Domain.yaml`','url: `${blackmatrix}/Clash/${name}/${name}_Domain.txt`'));
    check('check-clash-script.js',[at('Clash_Verge_Rev_Script.js')],1,'Apple domain rule-provider source');
    check('check-dual-client.js',[],1,'Clash Apple domain provider source drift');
    write('Clash_Verge_Rev_Script.js',clash);
    write('Clash_Verge_Rev_Script.js',mutate('Clash_Verge_Rev_Script.js',clash,"'RULE-SET,Apple,🍎 Apple,no-resolve',","'RULE-SET,Apple,🍎 Apple',"));
    check('check-clash-script.js',[at('Clash_Verge_Rev_Script.js')],1,'Clash classical RULE-SET must use no-resolve');
    check('check-dual-client.js',[],1,'Clash non-AI rule sequence drift');
    write('Clash_Verge_Rev_Script.js',clash);
    write('Clash_Verge_Rev_Script.js',mutate('Clash_Verge_Rev_Script.js',clash,"'GEOIP,CN,DIRECT',","'GEOIP,CN,DIRECT,no-resolve',"));
    check('check-clash-script.js',[at('Clash_Verge_Rev_Script.js')],1,'Clash GEOIP rule must not use no-resolve');
    write('Clash_Verge_Rev_Script.js',clash);
    write('Clash_Verge_Rev_Script.js',mutate('Clash_Verge_Rev_Script.js',clash,"'RULE-SET,Custom,🧩 自定义,no-resolve',\n",''));
    check('check-dual-client.js',[],1,'Clash Custom rule missing');
    write('Clash_Verge_Rev_Script.js',clash);
    write('Clash_Verge_Rev_Script.js',mutate('Clash_Verge_Rev_Script.js',clash,"    China: classicalProvider('China'),","    Advertising: classicalProvider('Advertising'),\n    China: classicalProvider('China'),"));
    check('check-clash-script.js',[at('Clash_Verge_Rev_Script.js')],1,'legacy Advertising providers must be absent');
    write('Clash_Verge_Rev_Script.js',clash);
    write('Clash_Verge_Rev_Script.js',mutate('Clash_Verge_Rev_Script.js',clash,"'DOMAIN-SUFFIX,anthropic.com,🤖 AI',",''));
    check('check-claude-routing.js',[],1,'Claude rules');
    write('Clash_Verge_Rev_Script.js',clash);

    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/TikTok/TikTok.list,📱 社交媒体\n',''));
    check('check-shadowrocket-routing.js',[],1,'missing required rule');
    check('check-dual-client.js',[],1,'Shadowrocket non-AI rule sequence drift');
    write('Shadowrocket_Routing.conf',routing);
    write('Shadowrocket_Routing.conf',mutate('Shadowrocket_Routing.conf',routing,'DOMAIN-SUFFIX,bytedance.com,DIRECT\n','').replace('RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/TikTok/TikTok.list,📱 社交媒体\n','RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/TikTok/TikTok.list,📱 社交媒体\nDOMAIN-SUFFIX,bytedance.com,DIRECT\n'));
    check('check-shadowrocket-routing.js',[],1,'rule order regression');
    check('check-dual-client.js',[],1,'Shadowrocket non-AI rule sequence drift');
    write('Shadowrocket_Routing.conf',routing);

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
    const syntheticGoogleKey='AIza'+'A'.repeat(35);
    fs.writeFileSync(candidate,syntheticGoogleKey+'\n');
    check('check-sensitive-data.js',[],1,'Google API key');
    const syntheticJwt='eyJhbGciOiJIUzI1NiJ9.'+'eyJzdWIiOiJ0ZXN0In0.'+'ABCDEFGHIJ1234567890';
    fs.writeFileSync(candidate,syntheticJwt+'\n');
    check('check-sensitive-data.js',[],1,'JWT token');
    // Empty CA field must not skip scanning tokens on the same line (M7).
    fs.writeFileSync(candidate,'ca-passphrase = "" # '+syntheticToken+'\n');
    check('check-sensitive-data.js',[],1,'GitHub token');
    // Modern proxy URI must be detected (M7).
    fs.writeFileSync(candidate,'any'+'tls://synthetic@198.51.100.1:443\n');
    check('check-sensitive-data.js',[],1,'proxy URI');
    fs.writeFileSync(candidate,assignment+'test-only\n'+assignment+'placeholder\n'+assignment+'YOUR_PASSWORD\n');
    // Untracked non-ignored files with secrets must also be caught before git add (M7).
    const untrackedLeak=path.join(temp,'untracked-leak.txt');
    fs.writeFileSync(untrackedLeak,syntheticToken+'\n');
    check('check-sensitive-data.js',[],1,'GitHub token');
    fs.rmSync(untrackedLeak);
    check('check-sensitive-data.js',[],0);

    console.log(`PASS: validator regressions cover every tracked checker, EOL syntax, hardening and M4 guards (${label})`);
  }finally{
    fs.rmSync(temp,{recursive:true,force:true});
  }
}

runSuite('\n');
runSuite('\r\n');
console.log('PASS: validator regressions hold under both LF and CRLF checkouts');
