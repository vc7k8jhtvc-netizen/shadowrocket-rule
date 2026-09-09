/**
 * Clash Verge Rev 订阅扩展脚本
 * 与小火箭分流策略保持一致
 *
 * 原理与优势：
 * 1. 继承原项目架构：“节点来源与分流逻辑分离”。
 * 2. 自动清空机场订阅中自带的杂乱策略组和规则，接管为本项目严格定义的策略组和分层规则。
 * 3. 同时兼容 proxies 与 proxy-providers，通过节点名称划分地区节点池。
 * 4. 与小火箭版本同步主要策略组、Advertising 与规则优先级。
 */

function main(config) {
  const logPrefix = '[shadowrocket-rule]';
  const writeLog = (level, message) => {
    if (typeof console === 'undefined') return;
    const output = typeof console[level] === 'function' ? console[level] : console.log;
    if (typeof output === 'function') output.call(console, `${logPrefix} ${message}`);
  };

  writeLog('log', '开始生成 Clash Verge Rev 配置');

  const allProxies = (config.proxies || []).map(p => p && p.name).filter(Boolean);
  const providerNames = Object.keys(config['proxy-providers'] || {});
  writeLog('log', `节点来源：proxies=${allProxies.length}，proxy-providers=${providerNames.length}`);

  if (allProxies.length === 0 && providerNames.length === 0) {
    const message = '订阅中没有可用的 proxies 或 proxy-providers，已停止生成配置以避免静默直连。';
    writeLog('error', message);
    throw new Error(message);
  }

  const allPattern = /^.+ \| .+$/;
  const filterNodes = (regex) => allProxies.filter(name => regex.test(name));

  const regionPatterns = {
    hk: /^.*Hong Kong \| .+$/,
    tw: /^.*Taiwan \| .+$/,
    sg: /^.*Singapore \| .+$/,
    jp: /^.*Japan \| .+$/,
    us: /^.*United States \| .+$/
  };
  const regionMatches = {
    hk: filterNodes(regionPatterns.hk),
    tw: filterNodes(regionPatterns.tw),
    sg: filterNodes(regionPatterns.sg),
    jp: filterNodes(regionPatterns.jp),
    us: filterNodes(regionPatterns.us)
  };
  writeLog('log', `地区匹配：香港=${regionMatches.hk.length}，台湾=${regionMatches.tw.length}，新加坡=${regionMatches.sg.length}，日本=${regionMatches.jp.length}，美国=${regionMatches.us.length}`);

  const regionalGroup = (name, regex, matchedNodes) => {
    const group = { name, type: 'select', 'empty-fallback': 'REJECT' };
    if (matchedNodes.length > 0) group.proxies = matchedNodes;
    if (providerNames.length > 0) {
      group.use = providerNames;
      group.filter = regex.source;
    }
    if (matchedNodes.length === 0 && providerNames.length === 0) {
      group.proxies = ['👆 手动选择'];
      writeLog('warn', `${name}未匹配到节点，使用“👆 手动选择”兜底`);
    }
    return group;
  };

  const allNodesGroup = { name: '👆 手动选择', type: 'select', 'empty-fallback': 'REJECT' };
  const compatibleProxies = allProxies.filter(name => allPattern.test(name));
  if (compatibleProxies.length === 0 && providerNames.length === 0) {
    const message = 'proxies 中没有符合 WestData 命名规则的节点，已停止生成配置。';
    writeLog('error', message);
    throw new Error(message);
  }
  if (compatibleProxies.length > 0) allNodesGroup.proxies = compatibleProxies;
  if (providerNames.length > 0) {
    allNodesGroup.use = providerNames;
    allNodesGroup.filter = allPattern.source;
  }

  config['proxy-groups'] = [
    allNodesGroup,
    regionalGroup('🇭🇰 香港', regionPatterns.hk, regionMatches.hk),
    regionalGroup('🏝️ 台湾', regionPatterns.tw, regionMatches.tw),
    regionalGroup('🇸🇬 新加坡', regionPatterns.sg, regionMatches.sg),
    regionalGroup('🇯🇵 日本', regionPatterns.jp, regionMatches.jp),
    regionalGroup('🇺🇸 美国', regionPatterns.us, regionMatches.us),
    { name: '🚀 默认代理', type: 'select', proxies: ['🇭🇰 香港', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国', '🏝️ 台湾', '👆 手动选择'] },
    { name: '🤖 AI', type: 'select', proxies: ['🇸🇬 新加坡', '🇺🇸 美国', '🇯🇵 日本', '🚀 默认代理'] },
    { name: '🍎 Apple', type: 'select', proxies: ['DIRECT', '🚀 默认代理', '🇭🇰 香港', '🇺🇸 美国', '🇯🇵 日本', '👆 手动选择'] },
    { name: '🔎 Google', type: 'select', proxies: ['🚀 默认代理', '🇺🇸 美国', '🇯🇵 日本', '🇸🇬 新加坡'] },
    { name: '💻 GitHub', type: 'select', proxies: ['🚀 默认代理', '🇺🇸 美国'] },
    { name: '🪟 Microsoft', type: 'select', proxies: ['DIRECT', '🚀 默认代理', '🇺🇸 美国', '👆 手动选择'] },
    { name: '📱 社交媒体', type: 'select', proxies: ['🚀 默认代理', '🇺🇸 美国', '🇸🇬 新加坡', '🇯🇵 日本'] },
    { name: '▶️ YouTube', type: 'select', proxies: ['🚀 默认代理', '🇯🇵 日本', '🇺🇸 美国', '🇸🇬 新加坡'] },
    { name: '✈️ Telegram', type: 'select', proxies: ['🚀 默认代理', '🇸🇬 新加坡', '🇭🇰 香港', '🇯🇵 日本'] },
    { name: '🌍 Global', type: 'select', proxies: ['🚀 默认代理', '🇺🇸 美国', '🇯🇵 日本', '🇸🇬 新加坡'] },
    { name: '🛑 广告拦截', type: 'select', proxies: ['REJECT', 'DIRECT', '🚀 默认代理'] }
  ];

  writeLog('log', '保留订阅 DNS 与 hosts，不改写节点入口解析链路');
  config.mode = 'rule';
  config.profile = Object.assign({}, config.profile || {}, { 'store-selected': true, 'store-fake-ip': true });

  const blackmatrix = 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule';
  const classicalProvider = (name) => ({
    type: 'http', behavior: 'classical', format: 'yaml',
    url: `${blackmatrix}/Clash/${name}/${name}.yaml`,
    path: `./rule_providers/${name}.yaml`, interval: 86400, proxy: '🚀 默认代理'
  });

  config['rule-providers'] = {
    Lan: classicalProvider('Lan'),
    Apple: classicalProvider('Apple'),
    Apple_Domain: { type: 'http', behavior: 'domain', format: 'text', url: `${blackmatrix}/Shadowrocket/Apple/Apple_Domain.list`, path: './rule_providers/Apple_Domain.list', interval: 86400, proxy: '🚀 默认代理' },
    Microsoft: classicalProvider('Microsoft'),
    GitHub: classicalProvider('GitHub'),
    Telegram: classicalProvider('Telegram'),
    Twitter: classicalProvider('Twitter'),
    Instagram: classicalProvider('Instagram'),
    TikTok: classicalProvider('TikTok'),
    YouTube: classicalProvider('YouTube'),
    Google: classicalProvider('Google'),
    Advertising: { type: 'http', behavior: 'classical', format: 'yaml', url: `${blackmatrix}/Clash/Advertising/Advertising.yaml`, path: './rule_providers/Advertising.yaml', interval: 86400, proxy: '🚀 默认代理' },
    Advertising_Domain: { type: 'http', behavior: 'domain', format: 'text', url: `${blackmatrix}/Clash/Advertising/Advertising_Domain.txt`, path: './rule_providers/Advertising_Domain.txt', interval: 86400, proxy: '🚀 默认代理' },
    China: classicalProvider('China'),
    China_Domain: { type: 'http', behavior: 'domain', format: 'text', url: `${blackmatrix}/Shadowrocket/China/China_Domain.list`, path: './rule_providers/China_Domain.list', interval: 86400, proxy: '🚀 默认代理' }
  };

  config.rules = [
    'RULE-SET,Lan,DIRECT,no-resolve',
    'DOMAIN-SUFFIX,chatgpt.com,🤖 AI','DOMAIN-SUFFIX,ct.sendgrid.net,🤖 AI','DOMAIN-SUFFIX,intercom.io,🤖 AI','DOMAIN-SUFFIX,intercomcdn.com,🤖 AI','DOMAIN-SUFFIX,oaistatic.com,🤖 AI','DOMAIN-SUFFIX,oaiusercontent.com,🤖 AI','DOMAIN-SUFFIX,openai.com,🤖 AI','DOMAIN-SUFFIX,oaistatsig.com,🤖 AI',
    'DOMAIN,cdn.openaimerge.com,🤖 AI','DOMAIN,cdn.workos.com,🤖 AI','DOMAIN,challenges.cloudflare.com,🤖 AI','DOMAIN,forwarder.workos.com,🤖 AI','DOMAIN,humb.apple.com,🤖 AI','DOMAIN,images.workoscdn.com,🤖 AI','DOMAIN,js.stripe.com,🤖 AI','DOMAIN,o207216.ingest.sentry.io,🤖 AI','DOMAIN,o33249.ingest.sentry.io,🤖 AI','DOMAIN,rum.browser-intake-datadoghq.com,🤖 AI','DOMAIN,setup.workos.com,🤖 AI','DOMAIN,workos.imgix.net,🤖 AI',
    'DOMAIN,gemini.google.com,🤖 AI','DOMAIN-SUFFIX,ai.google,🤖 AI','DOMAIN,generativelanguage.googleapis.com,🤖 AI','DOMAIN-SUFFIX,x.ai,🤖 AI','DOMAIN-SUFFIX,grok.com,🤖 AI',
    'RULE-SET,Advertising,🛑 广告拦截','RULE-SET,Advertising_Domain,🛑 广告拦截',
    'RULE-SET,Apple,🍎 Apple','RULE-SET,Apple_Domain,🍎 Apple','RULE-SET,Microsoft,🪟 Microsoft','RULE-SET,GitHub,💻 GitHub','RULE-SET,Telegram,✈️ Telegram',
    'DOMAIN-SUFFIX,bytedance.com,DIRECT','DOMAIN-SUFFIX,bytedance.net,DIRECT',
    'RULE-SET,Twitter,📱 社交媒体','RULE-SET,Instagram,📱 社交媒体','RULE-SET,TikTok,📱 社交媒体','RULE-SET,YouTube,▶️ YouTube','RULE-SET,Google,🔎 Google',
    'RULE-SET,China,DIRECT','RULE-SET,China_Domain,DIRECT','GEOIP,CN,DIRECT,no-resolve','MATCH,🌍 Global'
  ];

  writeLog('log', `完成：策略组=${config['proxy-groups'].length}，规则集=${Object.keys(config['rule-providers']).length}，规则=${config.rules.length}，DNS/hosts=继承订阅`);
  return config;
}
