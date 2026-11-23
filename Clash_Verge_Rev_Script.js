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

  if (config.proxies !== undefined && (!Array.isArray(config.proxies) || config.proxies.some(p => !p || typeof p !== 'object' || typeof p.name !== 'string' || !p.name))) {
    throw new Error('订阅 proxies 格式无效，已停止生成配置。');
  }
  const allProxies = (config.proxies || []).map(p => p.name);
  const providerNames = Object.keys(config['proxy-providers'] || {});
  const providerNameSet = new Set(providerNames);
  writeLog('log', `节点来源：proxies=${allProxies.length}，proxy-providers=${providerNames.length}`);

  if (allProxies.length === 0 && providerNames.length === 0) {
    const message = '订阅中没有可用的 proxies 或 proxy-providers，已停止生成配置以避免静默直连。';
    writeLog('error', message);
    throw new Error(message);
  }
  if (new Set(allProxies).size !== allProxies.length) {
    throw new Error('订阅 proxies 存在重复节点名称，已停止生成配置。');
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
      group.proxies = ['REJECT'];
      writeLog('warn', `${name}未匹配到节点，已按 REJECT 兜底以避免跨区静默回退`);
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
    { name: '🚀 默认代理', type: 'select', proxies: ['🇭🇰 香港', '🏝️ 台湾', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国', '👆 手动选择'] },
    allNodesGroup,
    { name: '🤖 AI', type: 'select', proxies: ['🇸🇬 新加坡', '🇭🇰 香港', '🏝️ 台湾', '🇯🇵 日本', '🇺🇸 美国', '🚀 默认代理', '👆 手动选择'] },
    { name: '🍎 Apple', type: 'select', proxies: ['DIRECT', '🇭🇰 香港', '🏝️ 台湾', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国', '🚀 默认代理', '👆 手动选择'] },
    { name: '🔎 Google', type: 'select', proxies: ['🚀 默认代理', '🇭🇰 香港', '🏝️ 台湾', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国', '👆 手动选择'] },
    { name: '💻 GitHub', type: 'select', proxies: ['🚀 默认代理', '🇭🇰 香港', '🏝️ 台湾', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国', '👆 手动选择'] },
    { name: '🪟 Microsoft', type: 'select', proxies: ['DIRECT', '🇭🇰 香港', '🏝️ 台湾', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国', '🚀 默认代理', '👆 手动选择'] },
    { name: '📱 社交媒体', type: 'select', proxies: ['🚀 默认代理', '🇭🇰 香港', '🏝️ 台湾', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国', '👆 手动选择'] },
    { name: '▶️ YouTube', type: 'select', proxies: ['🚀 默认代理', '🇭🇰 香港', '🏝️ 台湾', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国', '👆 手动选择'] },
    { name: '✈️ Telegram', type: 'select', proxies: ['🚀 默认代理', '🇭🇰 香港', '🏝️ 台湾', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国', '👆 手动选择'] },
    { name: '🧩 自定义', type: 'select', proxies: ['🚀 默认代理', '🇭🇰 香港', '🏝️ 台湾', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国', '👆 手动选择'] },
    { name: '🔞 NSFW', type: 'select', proxies: ['🚀 默认代理', '🇭🇰 香港', '🏝️ 台湾', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国', '👆 手动选择'] },
    { name: '🐟 漏网之鱼', type: 'select', proxies: ['🚀 默认代理', 'DIRECT', '🇭🇰 香港', '🏝️ 台湾', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国', '👆 手动选择'] },
    regionalGroup('🇭🇰 香港', regionPatterns.hk, regionMatches.hk),
    regionalGroup('🏝️ 台湾', regionPatterns.tw, regionMatches.tw),
    regionalGroup('🇸🇬 新加坡', regionPatterns.sg, regionMatches.sg),
    regionalGroup('🇯🇵 日本', regionPatterns.jp, regionMatches.jp),
    regionalGroup('🇺🇸 美国', regionPatterns.us, regionMatches.us)
  ];
  const projectGroupNames = new Set(proxyGroups.map(group => group.name));
  if (allProxies.some(name => projectGroupNames.has(name))) {
    throw new Error('订阅节点名称与项目策略组名称冲突，已停止生成配置。');
  }

  writeLog('log', '保留订阅 DNS 与 hosts，不改写节点入口解析链路');

  const blackmatrix = 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule';
  const classicalProvider = (name) => ({
    type: 'http', behavior: 'classical', format: 'yaml',
    url: `${blackmatrix}/Clash/${name}/${name}.yaml`,
    path: `./rule_providers/${name}.yaml`, interval: 86400, proxy: '🚀 默认代理'
  });
  const domainProvider = (name) => ({
    type: 'http', behavior: 'domain', format: 'yaml',
    url: `${blackmatrix}/Clash/${name}/${name}_Domain.yaml`,
    path: `./rule_providers/${name}_Domain.yaml`, interval: 86400, proxy: '🚀 默认代理'
  });

  const ruleProviders = {
    Lan: classicalProvider('Lan'),
    Apple: classicalProvider('Apple'),
    Apple_Domain: domainProvider('Apple'),
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
    Adult: {
      type: 'http', behavior: 'classical', format: 'text',
      url: 'https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Adult.list',
      path: './rule_providers/Adult.list', interval: 86400, proxy: '🚀 默认代理'
    },
    China: classicalProvider('China'),
    China_Domain: domainProvider('China')
  };

  // Preserve only subscription dependencies used by nodes, provider downloads or DNS.
  // Private names avoid changing either dependency semantics or our routing groups.
  const originalGroupList = config['proxy-groups'] || [];
  if (!Array.isArray(originalGroupList) || originalGroupList.some(group => !group || typeof group !== 'object' || typeof group.name !== 'string' || !group.name)) {
    throw new Error('订阅策略组格式无效，已停止生成配置。');
  }
  const originalGroupNames = originalGroupList.map(group => group.name);
  if (new Set(originalGroupNames).size !== originalGroupNames.length) {
    throw new Error('订阅策略组存在重复名称，已停止生成配置。');
  }
  const staticProxyNames = new Set(allProxies);
  if (originalGroupNames.some(name => staticProxyNames.has(name))) {
    throw new Error('订阅节点名称与订阅策略组名称冲突，已停止生成配置。');
  }
  const originalGroups = new Map(originalGroupList.map(group => [group.name, group]));
  const originalRuleProviders = config['rule-providers'] || {};
  const policyNames = new Set([...allProxies, ...proxyGroups.map(group => group.name), ...originalGroups.keys()]);
  const retainedGroups = new Map();
  const retainedRuleProviders = new Map();
  const visiting = new Set();
  const builtinPolicies = new Set(['DIRECT', 'REJECT', 'REJECT-DROP', 'PASS', 'COMPATIBLE']);
  const privateName = (prefix, used) => {
    let index = 0;
    while (used.has(prefix + index)) index++;
    const name = prefix + index;
    used.add(name);
    return name;
  };
  const preservePolicy = name => {
    if (typeof name !== 'string' || !name) throw new Error('订阅依赖引用了无效策略。');
    if (originalGroups.has(name)) {
      if (visiting.has(name)) throw new Error('订阅依赖策略组存在循环引用。');
      if (retainedGroups.has(name)) return retainedGroups.get(name).name;
      visiting.add(name);
      const original = originalGroups.get(name);
      const retained = { ...original, name: privateName('__subscription_group_', policyNames) };
      retainedGroups.set(name, retained);
      if (original.proxies !== undefined) {
        if (!Array.isArray(original.proxies)) throw new Error('订阅依赖策略组 proxies 格式无效。');
        retained.proxies = original.proxies.map(preservePolicy);
      }
      if (original.use) {
        if (!Array.isArray(original.use) || original.use.some(provider => !providerNameSet.has(provider))) {
          throw new Error('订阅依赖策略组引用了不存在的 proxy-provider。');
        }
        retained.use = [...original.use];
      }
      visiting.delete(name);
      return retained.name;
    }
    if (staticProxyNames.has(name) || builtinPolicies.has(name)) return name;
    throw new Error('订阅依赖引用了不存在的策略。');
  };
  const preserveDialer = proxy => proxy && typeof proxy === 'object' && proxy['dialer-proxy']
    ? { ...proxy, 'dialer-proxy': preservePolicy(proxy['dialer-proxy']) } : proxy;
  const preserveDownload = provider => {
    if (!provider || typeof provider !== 'object') throw new Error('订阅依赖 Provider 格式无效。');
    const retained = { ...provider };
    if (provider.proxy) retained.proxy = preservePolicy(provider.proxy);
    if (provider.override) retained.override = preserveDialer(provider.override);
    if (Array.isArray(provider.payload)) retained.payload = provider.payload.map(preserveDialer);
    return retained;
  };
  const ruleProviderNames = new Set([...Object.keys(ruleProviders), ...Object.keys(originalRuleProviders)]);
  const normalizeRulePath = filePath => filePath.replace(/^\.\//, '');
  const usedRulePaths = new Set(Object.values(ruleProviders).map(p => p.path).filter(Boolean).map(normalizeRulePath));
  const preserveDnsRule = name => {
    if (retainedRuleProviders.has(name)) return retainedRuleProviders.get(name);
    if (!Object.prototype.hasOwnProperty.call(originalRuleProviders, name)) {
      throw new Error('订阅 DNS 引用的规则集不存在。');
    }
    const retainedName = privateName('__subscription_rule_', ruleProviderNames);
    retainedRuleProviders.set(name, retainedName);
    const retainedProvider = preserveDownload(originalRuleProviders[name]);
    if (typeof retainedProvider.path === 'string' && retainedProvider.path) {
      const normalizedPath = normalizeRulePath(retainedProvider.path);
      if (usedRulePaths.has(normalizedPath)) {
        const extMatch = retainedProvider.path.match(/(\.[A-Za-z0-9]+)$/);
        retainedProvider.path = `./rule_providers/${retainedName}${extMatch ? extMatch[1] : '.yaml'}`;
      }
      usedRulePaths.add(normalizeRulePath(retainedProvider.path));
    }
    ruleProviders[retainedName] = retainedProvider;
    return retainedName;
  };
  const preserveRuleSetList = raw => raw.split(',').map(name => preserveDnsRule(name.trim())).join(',');
  const preserveDnsServer = server => {
    if (typeof server !== 'string') return server;
    const hashIndex = server.indexOf('#');
    if (hashIndex === -1) return server;
    const base = server.slice(0, hashIndex);
    const parts = server.slice(hashIndex + 1).split('&');
    let proxyIndex = -1;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] && !parts[i].includes('=')) proxyIndex = i;
    }
    if (proxyIndex === -1) return server;
    const rawProxy = parts[proxyIndex];
    let decodedProxy = rawProxy;
    try { decodedProxy = decodeURIComponent(rawProxy); } catch {}
    // Mihomo reserves "RULES" (tunnel.DnsRespectRules): the DNS query follows routing rules.
    if (decodedProxy === 'RULES') return server;
    const retainedProxy = preservePolicy(decodedProxy);
    const nextParts = [...parts];
    nextParts[proxyIndex] = rawProxy.includes('%') ? encodeURIComponent(retainedProxy) : retainedProxy;
    return `${base}#${nextParts.join('&')}`;
  };
  const preserveDnsServers = value => Array.isArray(value) ? value.map(preserveDnsServer) : preserveDnsServer(value);
  const preserveDnsPolicyKey = key => {
    if (typeof key !== 'string') return key;
    const lower = key.toLowerCase();
    if (lower.startsWith('rule-set:')) {
      return 'rule-set:' + preserveRuleSetList(key.slice('rule-set:'.length));
    }
    if (lower.startsWith('geosite:')) return key;
    if (!key.includes(',')) return key;
    return key.split(',').map(part => {
      const trimmed = part.trim();
      if (trimmed.toLowerCase().startsWith('rule-set:')) {
        return 'rule-set:' + preserveDnsRule(trimmed.slice('rule-set:'.length).trim());
      }
      return part;
    }).join(',');
  };
  const preserveDnsRuleRefs = value => {
    if (typeof value === 'string') {
      if (!value.toLowerCase().startsWith('rule-set:')) return value;
      return 'rule-set:' + preserveRuleSetList(value.slice('rule-set:'.length));
    }
    if (Array.isArray(value)) return value.map(preserveDnsRuleRefs);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([k, item]) => [preserveDnsRuleRefs(k), preserveDnsRuleRefs(item)]));
    }
    return value;
  };
  const dnsServerListKeys = new Set(['nameserver', 'fallback', 'default-nameserver', 'proxy-server-nameserver', 'direct-nameserver']);
  const dnsPolicyMapKeys = new Set(['nameserver-policy', 'proxy-server-nameserver-policy']);
  const preserveDns = dnsConfig => {
    if (!dnsConfig || typeof dnsConfig !== 'object' || Array.isArray(dnsConfig)) return dnsConfig;
    return Object.fromEntries(Object.entries(dnsConfig).map(([key, value]) => {
      if (dnsServerListKeys.has(key)) return [key, preserveDnsServers(value)];
      if (dnsPolicyMapKeys.has(key) && value && typeof value === 'object' && !Array.isArray(value)) {
        return [key, Object.fromEntries(Object.entries(value).map(([policyKey, servers]) => [
          preserveDnsPolicyKey(policyKey),
          preserveDnsServers(servers)
        ]))];
      }
      return [key, preserveDnsRuleRefs(value)];
    }));
  };
  const proxies = config.proxies && config.proxies.map(preserveDialer);
  const proxyProviders = config['proxy-providers'] && Object.fromEntries(
    Object.entries(config['proxy-providers']).map(([name, provider]) => [name, preserveDownload(provider)])
  );
  const dns = preserveDns(config.dns);
  // Listeners and tunnels pin an exit policy; keep those dependencies like dialer-proxy.
  // Listener `rule` targets sub-rules, which cannot survive the full rule replacement below.
  const listeners = config.listeners === undefined ? undefined : (() => {
    if (!Array.isArray(config.listeners)) throw new Error('订阅 listeners 格式无效，已停止生成配置。');
    return config.listeners.map(listener => {
      if (!listener || typeof listener !== 'object') throw new Error('订阅 listeners 格式无效，已停止生成配置。');
      if (listener.rule !== undefined) throw new Error('订阅 listeners 引用了 sub-rules，脚本重建规则后无法保留，已停止生成配置。');
      return listener.proxy === undefined ? listener : { ...listener, proxy: preservePolicy(listener.proxy) };
    });
  })();
  const tunnels = config.tunnels === undefined ? undefined : (() => {
    if (!Array.isArray(config.tunnels)) throw new Error('订阅 tunnels 格式无效，已停止生成配置。');
    return config.tunnels.map(tunnel => {
      if (typeof tunnel === 'string') {
        // Compact form: network,address,target[,proxy]
        const parts = tunnel.split(',');
        if (parts.length !== 4) return tunnel;
        parts[3] = preservePolicy(parts[3].trim());
        return parts.join(',');
      }
      if (!tunnel || typeof tunnel !== 'object') throw new Error('订阅 tunnels 格式无效，已停止生成配置。');
      return tunnel.proxy === undefined ? tunnel : { ...tunnel, proxy: preservePolicy(tunnel.proxy) };
    });
  })();
  // Commit together after dependency checks, so rejected inputs are not half-rewritten.
  config['proxy-groups'] = [...proxyGroups, ...retainedGroups.values()];
  config['rule-providers'] = ruleProviders;
  if (proxies) config.proxies = proxies;
  if (proxyProviders) config['proxy-providers'] = proxyProviders;
  if (dns !== undefined) config.dns = dns;
  if (listeners) config.listeners = listeners;
  if (tunnels) config.tunnels = tunnels;
  // Sub-rules are only reachable from the subscription's own rules, which are replaced below.
  delete config['sub-rules'];
  config.profile = Object.assign({}, config.profile || {}, { 'store-selected': true, 'store-fake-ip': true });

  config.rules = [
    'RULE-SET,Lan,DIRECT,no-resolve',
    'DOMAIN-SUFFIX,deepseek.com,DIRECT',
    // >>> BEGIN AI RULES (generated from rules/ai-rules.json; run `node scripts/sync-ai-rules.js`) >>>
    // OpenAI / ChatGPT
    'DOMAIN-SUFFIX,chatgpt.com,🤖 AI',
    'DOMAIN-SUFFIX,oaistatic.com,🤖 AI',
    'DOMAIN-SUFFIX,oaiusercontent.com,🤖 AI',
    'DOMAIN-SUFFIX,openai.com,🤖 AI',
    'DOMAIN-SUFFIX,oaistatsig.com,🤖 AI',
    'DOMAIN,cdn.openaimerge.com,🤖 AI',
    'DOMAIN,o207216.ingest.sentry.io,🤖 AI',
    'DOMAIN,o33249.ingest.sentry.io,🤖 AI',
    // OpenAI 共享依赖（WorkOS、Intercom、Stripe、Cloudflare、Apple、Datadog）保持正常分流。
    // 个人 AI 中转
    'DOMAIN-SUFFIX,a6api.vip,🤖 AI',
    'DOMAIN-SUFFIX,a6api.com,🤖 AI',
    // Exa / Tavily
    'DOMAIN-SUFFIX,exa.ai,🤖 AI',
    'DOMAIN-SUFFIX,tavily.com,🤖 AI',
    // Supabase / Hugging Face
    'DOMAIN-SUFFIX,supabase.com,🤖 AI',
    'DOMAIN-SUFFIX,supabase.co,🤖 AI',
    'DOMAIN-SUFFIX,supabase.in,🤖 AI',
    'DOMAIN-SUFFIX,huggingface.co,🤖 AI',
    'DOMAIN-SUFFIX,hf.co,🤖 AI',
    'DOMAIN-SUFFIX,hf.space,🤖 AI',
    // Gemini / Google AI
    // 含 Antigravity、Google Labs / Flow / Opal、Gemini Web 后端与 Gemini Enterprise 专属入口；共享 Google 主机保持原分流。
    'DOMAIN-SUFFIX,gemini.google,🤖 AI',
    'DOMAIN-SUFFIX,gemini.google.com,🤖 AI',
    'DOMAIN-SUFFIX,bard.google.com,🤖 AI',
    'DOMAIN-SUFFIX,gemini.gstatic.com,🤖 AI',
    'DOMAIN-SUFFIX,geminiweb-pa.clients.google.com,🤖 AI',
    'DOMAIN-SUFFIX,geminiweb-pa.clients6.google.com,🤖 AI',
    'DOMAIN-SUFFIX,ai.google,🤖 AI',
    'DOMAIN-SUFFIX,ai.google.com,🤖 AI',
    'DOMAIN-SUFFIX,ai.google.dev,🤖 AI',
    'DOMAIN-SUFFIX,generativeai.google,🤖 AI',
    'DOMAIN-SUFFIX,ai.studio,🤖 AI',
    'DOMAIN-SUFFIX,aistudio.google.com,🤖 AI',
    'DOMAIN-SUFFIX,makersuite.google.com,🤖 AI',
    'DOMAIN-SUFFIX,alkalicore-pa.clients6.google.com,🤖 AI',
    'DOMAIN-SUFFIX,alkalimakersuite-pa.clients6.google.com,🤖 AI',
    'DOMAIN-SUFFIX,webchannel-alkalimakersuite-pa.clients6.google.com,🤖 AI',
    'DOMAIN-SUFFIX,robinfrontend-pa.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,aisandbox-pa.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,proactivebackend-pa.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,geller-pa.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,generativelanguage.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,generativelanguage.mtls.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,jnn-pa.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,waa-pa.clients6.google.com,🤖 AI',
    'DOMAIN-SUFFIX,appsgenaiserver-pa.clients.google.com,🤖 AI',
    'DOMAIN-SUFFIX,appsgenaiserver-pa.clients6.google.com,🤖 AI',
    'DOMAIN-SUFFIX,appsgenaiserver-pa.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,notebook.google,🤖 AI',
    'DOMAIN-SUFFIX,notebook.google.com,🤖 AI',
    'DOMAIN-SUFFIX,notebooklm.google,🤖 AI',
    'DOMAIN-SUFFIX,notebooklm.google.com,🤖 AI',
    'DOMAIN-SUFFIX,notebook.cloud.google,🤖 AI',
    'DOMAIN-SUFFIX,notebook.cloud.google.com,🤖 AI',
    'DOMAIN-SUFFIX,notebooklm.cloud.google,🤖 AI',
    'DOMAIN-SUFFIX,notebooklm.cloud.google.com,🤖 AI',
    'DOMAIN-SUFFIX,notebooklm-pa.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,notebooklm.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,labstailwind.pa.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,deepmind.com,🤖 AI',
    'DOMAIN-SUFFIX,deepmind.google,🤖 AI',
    'DOMAIN-SUFFIX,deepmind.google.com,🤖 AI',
    'DOMAIN-SUFFIX,antigravity.google,🤖 AI',
    'DOMAIN-SUFFIX,antigravity.google.com,🤖 AI',
    'DOMAIN-SUFFIX,antigravity.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,antigravity-pa.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,antigravity-unleash.goog,🤖 AI',
    'DOMAIN-SUFFIX,cloudaicompanion.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,cloudaicompanion.mtls.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,cloudcode-pa.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,daily-cloudcode-pa.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,daily-cloudcode-pa.sandbox.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,jules.google,🤖 AI',
    'DOMAIN-SUFFIX,jules.google.com,🤖 AI',
    'DOMAIN-SUFFIX,jules.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,labs.google,🤖 AI',
    'DOMAIN-SUFFIX,labs.google.com,🤖 AI',
    'DOMAIN-SUFFIX,flow.google,🤖 AI',
    'DOMAIN-SUFFIX,flow.google.com,🤖 AI',
    'DOMAIN-SUFFIX,opal.google,🤖 AI',
    'DOMAIN-SUFFIX,opal.google.com,🤖 AI',
    'DOMAIN-SUFFIX,opal.goog,🤖 AI',
    'DOMAIN-SUFFIX,opal.withgoogle.com,🤖 AI',
    'DOMAIN-SUFFIX,appcatalyst.pa.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,stitch.withgoogle.com,🤖 AI',
    'DOMAIN-SUFFIX,aitestkitchen.withgoogle.com,🤖 AI',
    'DOMAIN-SUFFIX,gemma.ai,🤖 AI',
    'DOMAIN-SUFFIX,aicode.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,aida.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,speechs3proto2-pa.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,aiplatform.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,aiplatform.mtls.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,aiplatform.eu.rep.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,aiplatform.us.rep.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,businessaicode.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,businessaicode.mtls.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,businessaicode.eu.rep.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,businessaicode.us.rep.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,discoveryengine.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,discoveryengine.mtls.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,discoveryengine.clients6.google.com,🤖 AI',
    'DOMAIN-SUFFIX,eu-discoveryengine.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,eu-discoveryengine.mtls.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,eu-discoveryengine.clients6.google.com,🤖 AI',
    'DOMAIN-SUFFIX,us-discoveryengine.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,us-discoveryengine.mtls.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,us-discoveryengine.clients6.google.com,🤖 AI',
    'DOMAIN-SUFFIX,global-discoveryengine.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,global-discoveryengine.mtls.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,opa-pa.googleapis.com,🤖 AI',
    'DOMAIN-SUFFIX,opa-pa.clients6.google.com,🤖 AI',
    'DOMAIN-WILDCARD,*-aiplatform.googleapis.com,🤖 AI',
    // Grok / xAI
    'DOMAIN-SUFFIX,x.ai,🤖 AI',
    'DOMAIN-SUFFIX,grok.com,🤖 AI',
    'DOMAIN-SUFFIX,grokusercontent.com,🤖 AI',
    'DOMAIN-SUFFIX,grok-sandbox.com,🤖 AI',
    'DOMAIN-SUFFIX,groktpcontent.com,🤖 AI',
    'DOMAIN-SUFFIX,grok.me,🤖 AI',
    'DOMAIN-SUFFIX,grokipedia.com,🤖 AI',
    // Claude / Anthropic
    'DOMAIN-SUFFIX,claude.ai,🤖 AI',
    'DOMAIN-SUFFIX,claude.com,🤖 AI',
    'DOMAIN-SUFFIX,anthropic.com,🤖 AI',
    'DOMAIN-SUFFIX,claudeusercontent.com,🤖 AI',
    // Canva
    // Canva 可画（中国大陆服务）直连；其余 Canva 自有域名走 AI。
    'DOMAIN-SUFFIX,canva.cn,DIRECT',
    'DOMAIN-SUFFIX,canva-apps.cn,DIRECT',
    'DOMAIN-SUFFIX,canva-code.cn,DIRECT',
    'DOMAIN-SUFFIX,my.canvasite.cn,DIRECT',
    'DOMAIN-SUFFIX,canva.com,🤖 AI',
    'DOMAIN-SUFFIX,canva.ai,🤖 AI',
    'DOMAIN-SUFFIX,canva.app,🤖 AI',
    'DOMAIN-SUFFIX,canva.dev,🤖 AI',
    'DOMAIN-SUFFIX,canva.me,🤖 AI',
    'DOMAIN-SUFFIX,canva.site,🤖 AI',
    'DOMAIN-SUFFIX,canva.link,🤖 AI',
    'DOMAIN-SUFFIX,canva.run,🤖 AI',
    'DOMAIN-SUFFIX,canva-apps.com,🤖 AI',
    'DOMAIN-SUFFIX,canva-hosted-embed.com,🤖 AI',
    'DOMAIN-SUFFIX,canvacode.com,🤖 AI',
    'DOMAIN-SUFFIX,canvastatus.com,🤖 AI',
    // <<< END AI RULES <<<
    'RULE-SET,Apple,🍎 Apple,no-resolve','RULE-SET,Apple_Domain,🍎 Apple','RULE-SET,Microsoft,🪟 Microsoft,no-resolve','RULE-SET,GitHub,💻 GitHub,no-resolve','RULE-SET,Telegram,✈️ Telegram,no-resolve',
    'DOMAIN-SUFFIX,bytedance.com,DIRECT','DOMAIN-SUFFIX,bytedance.net,DIRECT',
    'RULE-SET,Twitter,📱 社交媒体,no-resolve','RULE-SET,Instagram,📱 社交媒体,no-resolve','RULE-SET,TikTok,📱 社交媒体,no-resolve','RULE-SET,YouTube,▶️ YouTube,no-resolve','RULE-SET,Google,🔎 Google,no-resolve',
    'RULE-SET,Custom,🧩 自定义,no-resolve',
    'RULE-SET,Adult,🔞 NSFW,no-resolve',
    'RULE-SET,China,DIRECT,no-resolve','RULE-SET,China_Domain,DIRECT','GEOIP,CN,DIRECT','MATCH,🐟 漏网之鱼'
  ];

  writeLog('log', `完成：策略组=${config['proxy-groups'].length}，规则集=${Object.keys(config['rule-providers']).length}，规则=${config.rules.length}，DNS/hosts=继承订阅`);
  return config;
}
