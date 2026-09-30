/**
 * Clash Verge Rev 订阅扩展脚本
 * 与小火箭分流策略保持一致。
 * 继承订阅 DNS / hosts / 节点入口，重建代理组和正常分流。
 * 不加载通用 Advertising 广告黑名单；YouTube 增强为 Shadowrocket 专属模块。
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

  const proxyGroups = [
    { name: '🚀 默认代理', type: 'select', proxies: ['🇭🇰 香港', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国', '🏝️ 台湾', '👆 手动选择'] },
    allNodesGroup,
    { name: '🤖 AI', type: 'select', proxies: ['🇸🇬 新加坡', '🇺🇸 美国', '🇯🇵 日本', '🚀 默认代理'] },
    { name: '🍎 Apple', type: 'select', proxies: ['DIRECT', '🚀 默认代理', '🇭🇰 香港', '🇺🇸 美国', '🇯🇵 日本', '👆 手动选择'] },
    { name: '🔎 Google', type: 'select', proxies: ['🚀 默认代理', '🇺🇸 美国', '🇯🇵 日本', '🇸🇬 新加坡'] },
    { name: '💻 GitHub', type: 'select', proxies: ['🚀 默认代理', '🇺🇸 美国'] },
    { name: '🪟 Microsoft', type: 'select', proxies: ['DIRECT', '🚀 默认代理', '🇺🇸 美国', '👆 手动选择'] },
    { name: '📱 社交媒体', type: 'select', proxies: ['🚀 默认代理', '🇺🇸 美国', '🇸🇬 新加坡', '🇯🇵 日本'] },
    { name: '▶️ YouTube', type: 'select', proxies: ['🚀 默认代理', '🇯🇵 日本', '🇺🇸 美国', '🇸🇬 新加坡'] },
    { name: '✈️ Telegram', type: 'select', proxies: ['🚀 默认代理', '🇸🇬 新加坡', '🇭🇰 香港', '🇯🇵 日本'] },
    { name: '🧩 自定义', type: 'select', proxies: ['🚀 默认代理', '🇺🇸 美国', '🇯🇵 日本', '🇸🇬 新加坡'] },
    { name: '🐟 漏网之鱼', type: 'select', proxies: ['🚀 默认代理', 'DIRECT', '🇺🇸 美国', '🇯🇵 日本', '🇸🇬 新加坡', '👆 手动选择'] },
    regionalGroup('🇭🇰 香港', regionPatterns.hk, regionMatches.hk),
    regionalGroup('🏝️ 台湾', regionPatterns.tw, regionMatches.tw),
    regionalGroup('🇸🇬 新加坡', regionPatterns.sg, regionMatches.sg),
    regionalGroup('🇯🇵 日本', regionPatterns.jp, regionMatches.jp),
    regionalGroup('🇺🇸 美国', regionPatterns.us, regionMatches.us)
  ];

  writeLog('log', '保留订阅 DNS 与 hosts，不改写节点入口解析链路');

  const blackmatrix = 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule';
  const classicalProvider = (name) => ({
    type: 'http', behavior: 'classical', format: 'yaml',
    url: `${blackmatrix}/Clash/${name}/${name}.yaml`,
    path: `./rule_providers/${name}.yaml`, interval: 86400, proxy: '🚀 默认代理'
  });

  const ruleProviders = {
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
    Custom: {
      type: 'http', behavior: 'classical', format: 'text',
      url: 'https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Custom.list',
      path: './rule_providers/Custom.list', interval: 86400, proxy: '🚀 默认代理'
    },
    China: classicalProvider('China'),
    China_Domain: { type: 'http', behavior: 'domain', format: 'text', url: `${blackmatrix}/Clash/China/China_Domain.txt`, path: './rule_providers/China_Domain.txt', interval: 86400, proxy: '🚀 默认代理' }
  };

  // Preserve only subscription dependencies used by nodes, provider downloads or DNS.
  // Private names avoid changing either dependency semantics or our routing groups.
  const originalGroups = new Map((config['proxy-groups'] || []).map(group => [group.name, group]));
  const originalRuleProviders = config['rule-providers'] || {};
  const policyNames = new Set([...allProxies, ...proxyGroups.map(group => group.name), ...originalGroups.keys()]);
  const retainedGroups = new Map();
  const retainedRuleProviders = new Map();
  const visiting = new Set();
  const privateName = (prefix, used) => {
    let index = 0;
    while (used.has(prefix + index)) index++;
    const name = prefix + index;
    used.add(name);
    return name;
  };
  const preservePolicy = name => {
    if (!originalGroups.has(name)) return name;
    if (visiting.has(name)) throw new Error('订阅依赖策略组存在循环引用。');
    if (retainedGroups.has(name)) return retainedGroups.get(name).name;
    visiting.add(name);
    const original = originalGroups.get(name);
    const retained = { ...original, name: privateName('__subscription_group_', policyNames) };
    retainedGroups.set(name, retained);
    if (original.proxies) retained.proxies = original.proxies.map(preservePolicy);
    visiting.delete(name);
    return retained.name;
  };
  const preserveDialer = proxy => proxy && proxy['dialer-proxy']
    ? { ...proxy, 'dialer-proxy': preservePolicy(proxy['dialer-proxy']) } : proxy;
  const preserveDownload = provider => {
    const retained = { ...provider };
    if (provider.proxy) retained.proxy = preservePolicy(provider.proxy);
    if (provider.override) retained.override = preserveDialer(provider.override);
    if (provider.payload) retained.payload = provider.payload.map(preserveDialer);
    return retained;
  };
  const ruleProviderNames = new Set([...Object.keys(ruleProviders), ...Object.keys(originalRuleProviders)]);
  const preserveDnsRule = name => {
    if (retainedRuleProviders.has(name)) return retainedRuleProviders.get(name);
    if (!Object.prototype.hasOwnProperty.call(originalRuleProviders, name)) {
      throw new Error('订阅 DNS 引用的规则集不存在。');
    }
    const retainedName = privateName('__subscription_rule_', ruleProviderNames);
    retainedRuleProviders.set(name, retainedName);
    ruleProviders[retainedName] = preserveDownload(originalRuleProviders[name]);
    return retainedName;
  };
  const preserveDns = value => {
    if (typeof value === 'string') {
      if (!value.startsWith('rule-set:')) return value;
      return 'rule-set:' + value.slice('rule-set:'.length).split(',').map(name => preserveDnsRule(name.trim())).join(',');
    }
    if (Array.isArray(value)) return value.map(preserveDns);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [preserveDns(key), preserveDns(item)]));
    }
    return value;
  };
  const proxies = config.proxies && config.proxies.map(preserveDialer);
  const proxyProviders = config['proxy-providers'] && Object.fromEntries(
    Object.entries(config['proxy-providers']).map(([name, provider]) => [name, preserveDownload(provider)])
  );
  const dns = preserveDns(config.dns);
  // Commit together after dependency checks, so rejected inputs are not half-rewritten.
  config['proxy-groups'] = [...proxyGroups, ...retainedGroups.values()];
  config['rule-providers'] = ruleProviders;
  if (proxies) config.proxies = proxies;
  if (proxyProviders) config['proxy-providers'] = proxyProviders;
  if (dns !== undefined) config.dns = dns;
  config.profile = Object.assign({}, config.profile || {}, { 'store-selected': true, 'store-fake-ip': true });

  config.rules = [
    'RULE-SET,Lan,DIRECT,no-resolve',
    'DOMAIN-SUFFIX,deepseek.com,DIRECT',
    'DOMAIN-SUFFIX,chatgpt.com,🤖 AI','DOMAIN-SUFFIX,ct.sendgrid.net,🤖 AI','DOMAIN-SUFFIX,intercom.io,🤖 AI','DOMAIN-SUFFIX,intercomcdn.com,🤖 AI','DOMAIN-SUFFIX,oaistatic.com,🤖 AI','DOMAIN-SUFFIX,oaiusercontent.com,🤖 AI','DOMAIN-SUFFIX,openai.com,🤖 AI','DOMAIN-SUFFIX,oaistatsig.com,🤖 AI',
    'DOMAIN,cdn.openaimerge.com,🤖 AI','DOMAIN,cdn.workos.com,🤖 AI','DOMAIN,challenges.cloudflare.com,🤖 AI','DOMAIN,forwarder.workos.com,🤖 AI','DOMAIN,humb.apple.com,🤖 AI','DOMAIN,images.workoscdn.com,🤖 AI','DOMAIN,js.stripe.com,🤖 AI','DOMAIN,o207216.ingest.sentry.io,🤖 AI','DOMAIN,o33249.ingest.sentry.io,🤖 AI','DOMAIN,rum.browser-intake-datadoghq.com,🤖 AI','DOMAIN,setup.workos.com,🤖 AI','DOMAIN,workos.imgix.net,🤖 AI',
    'DOMAIN,gemini.google.com,🤖 AI','DOMAIN-SUFFIX,ai.google,🤖 AI','DOMAIN,generativelanguage.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,x.ai,🤖 AI','DOMAIN-SUFFIX,grok.com,🤖 AI','DOMAIN-SUFFIX,grokusercontent.com,🤖 AI','DOMAIN-SUFFIX,grok-sandbox.com,🤖 AI','DOMAIN-SUFFIX,groktpcontent.com,🤖 AI','DOMAIN-SUFFIX,grok.me,🤖 AI','DOMAIN-SUFFIX,grokipedia.com,🤖 AI','DOMAIN-SUFFIX,featureassets.org,🤖 AI',
    'DOMAIN-SUFFIX,claude.ai,🤖 AI','DOMAIN-SUFFIX,claude.com,🤖 AI','DOMAIN-SUFFIX,anthropic.com,🤖 AI','DOMAIN-SUFFIX,claudeusercontent.com,🤖 AI',
    'RULE-SET,Apple,🍎 Apple','RULE-SET,Apple_Domain,🍎 Apple','RULE-SET,Microsoft,🪟 Microsoft','RULE-SET,GitHub,💻 GitHub','RULE-SET,Telegram,✈️ Telegram',
    'DOMAIN-SUFFIX,bytedance.com,DIRECT','DOMAIN-SUFFIX,bytedance.net,DIRECT',
    'RULE-SET,Twitter,📱 社交媒体','RULE-SET,Instagram,📱 社交媒体','RULE-SET,TikTok,📱 社交媒体','RULE-SET,YouTube,▶️ YouTube','RULE-SET,Google,🔎 Google',
    'RULE-SET,Custom,🧩 自定义',
    'RULE-SET,China,DIRECT','RULE-SET,China_Domain,DIRECT','GEOIP,CN,DIRECT','MATCH,🐟 漏网之鱼'
  ];

  writeLog('log', `完成：策略组=${config['proxy-groups'].length}，规则集=${Object.keys(config['rule-providers']).length}，规则=${config.rules.length}，DNS/hosts=继承订阅`);
  return config;
}
