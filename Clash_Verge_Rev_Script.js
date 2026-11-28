/**
 * Clash Verge Rev 订阅扩展脚本
 * 版本：v2.7.40
 * 与小火箭分流策略保持一致。
 * 继承订阅 DNS / hosts / 节点入口，重建代理组和正常分流。
 * 不加载通用 Advertising 广告黑名单；YouTube 增强为 Shadowrocket 专属模块。
 */

/**
 * Clash Verge Rev 订阅扩展脚本入口。
 * 负责校验订阅结构、按地区过滤节点、重建代理策略组、保留订阅依赖，并生成与小火箭一致的分流规则。
 *
 * @param {object} config 订阅解析后的 Mihomo/Clash 配置对象
 * @returns {object} 重建后的配置对象
 */
function main(config) {
  const scriptVersion = 'v2.7.40';
  const logPrefix = '[shadowrocket-rule]';
  // 兼容无 console 或缺少对应日志级别方法（如部分沙箱/旧内核）的运行环境
  const writeLog = (level, message) => {
    if (typeof console === 'undefined') return;
    const output = typeof console[level] === 'function' ? console[level] : console.log;
    if (typeof output === 'function') output.call(console, `${logPrefix} ${message}`);
  };

  writeLog('log', `开始生成 Clash Verge Rev 配置 (${scriptVersion})`);

  // ==================== 1. 订阅基础校验与节点收集 ====================
  // 校验静态节点列表 proxies 格式（允许未定义或 null，因为 YAML 空键会解析为 null）
  if (config.proxies != null && (!Array.isArray(config.proxies) || config.proxies.some(p => !p || typeof p !== 'object' || typeof p.name !== 'string' || !p.name))) {
    throw new Error('订阅 proxies 格式无效，已停止生成配置。');
  }
  // 校验远程/内联节点提供者 proxy-providers 格式（必须为键值对对象而非数组）
  if (config['proxy-providers'] != null && (typeof config['proxy-providers'] !== 'object' || Array.isArray(config['proxy-providers']))) {
    throw new Error('订阅 proxy-providers 格式无效，已停止生成配置。');
  }
  const allProxies = (Array.isArray(config.proxies) ? config.proxies : []).map(p => p.name);
  const providerNames = Object.keys(config['proxy-providers'] || {});
  const providerNameSet = new Set(providerNames);
  writeLog('log', `节点来源：proxies=${allProxies.length}，proxy-providers=${providerNames.length}`);

  // 至少需要一种节点来源；全部为空时直接中断，防止静默直连泄露流量
  if (allProxies.length === 0 && providerNames.length === 0) {
    const message = '订阅中没有可用的 proxies 或 proxy-providers，已停止生成配置以避免静默直连。';
    writeLog('error', message);
    throw new Error(message);
  }
  // 静态节点名称必须唯一，避免策略组引用歧义
  if (new Set(allProxies).size !== allProxies.length) {
    throw new Error('订阅 proxies 存在重复节点名称，已停止生成配置。');
  }

  // ==================== 2. 节点正则筛选与地区策略组 ====================
  // WestData 节点命名规范为 `<地区名称> | <节点标识>`，以此排除套餐/剩余流量等提示条目
  const allPattern = /^.+ \| .+$/;
  const filterNodes = (regex) => allProxies.filter(name => regex.test(name));

  // 五大常用地区节点匹配正则（保持大小写敏感，与 Shadowrocket 端保持一致）
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

  /**
   * 构造地区策略组。
   * 当该地区既无匹配的静态节点也无 proxy-provider 时，显式以 REJECT 兜底；
   * 同时设置 empty-fallback 为 REJECT，防止过滤为空时静默回退到其他地区或直连。
   */
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

  // 手动选择节点池：聚合所有符合命名规范的静态节点与 provider 过滤结果
  const allNodesGroup = { name: '👆 手动选择', type: 'select', 'empty-fallback': 'REJECT' };
  const compatibleProxies = allProxies.filter(name => allPattern.test(name));
  // 纯静态节点订阅若没有任何符合 WestData 命名规范的节点，则直接拒绝生成
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

  // ==================== 3. 重建代理策略组 ====================
  // 保持固定的展示顺序与默认首选，确保与 Shadowrocket_Routing.conf 完全对齐
  const proxyGroups = [
    { name: '🚀 默认代理', type: 'select', proxies: ['🇭🇰 香港', '🏝️ 台湾', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国', '👆 手动选择'] },
    allNodesGroup,
    { name: '🤖 AI', type: 'select', proxies: ['🇸🇬 新加坡', '🇭🇰 香港', '🏝️ 台湾', '🇯🇵 日本', '🇺🇸 美国', '🚀 默认代理', '👆 手动选择'] },
    { name: '🍎 Apple', type: 'select', proxies: ['DIRECT', '🇭🇰 香港', '🏝️ 台湾', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国', '🚀 默认代理', '👆 手动选择'] },
    { name: '🔎 Google', type: 'select', proxies: ['🚀 默认代理', '🇭🇰 香港', '🏝️ 台湾', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国', '👆 手动选择'] },
    { name: '💻 开发工具', type: 'select', proxies: ['🚀 默认代理', '🇭🇰 香港', '🏝️ 台湾', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国', '👆 手动选择'] },
    { name: '🪟 Microsoft', type: 'select', proxies: ['DIRECT', '🇭🇰 香港', '🏝️ 台湾', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国', '🚀 默认代理', '👆 手动选择'] },
    { name: '📱 社交媒体', type: 'select', proxies: ['🚀 默认代理', '🇭🇰 香港', '🏝️ 台湾', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国', '👆 手动选择'] },
    { name: '▶️ YouTube', type: 'select', proxies: ['🚀 默认代理', '🇭🇰 香港', '🏝️ 台湾', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国', '👆 手动选择'] },
    { name: '✈️ Telegram', type: 'select', proxies: ['🚀 默认代理', '🇭🇰 香港', '🏝️ 台湾', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国', '👆 手动选择'] },
    { name: '🔞 NSFW', type: 'select', proxies: ['🚀 默认代理', '🇭🇰 香港', '🏝️ 台湾', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国', '👆 手动选择'] },
    { name: '🐟 漏网之鱼', type: 'select', proxies: ['🚀 默认代理', 'DIRECT', '🇭🇰 香港', '🏝️ 台湾', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国', '👆 手动选择'] },
    regionalGroup('🇭🇰 香港', regionPatterns.hk, regionMatches.hk),
    regionalGroup('🏝️ 台湾', regionPatterns.tw, regionMatches.tw),
    regionalGroup('🇸🇬 新加坡', regionPatterns.sg, regionMatches.sg),
    regionalGroup('🇯🇵 日本', regionPatterns.jp, regionMatches.jp),
    regionalGroup('🇺🇸 美国', regionPatterns.us, regionMatches.us)
  ];
  // 禁止订阅静态节点名称与项目策略组重名，以免破坏规则目标解析
  const projectGroupNames = new Set(proxyGroups.map(group => group.name));
  if (allProxies.some(name => projectGroupNames.has(name))) {
    throw new Error('订阅节点名称与项目策略组名称冲突，已停止生成配置。');
  }

  // ==================== 4. 外部规则集（Rule Providers）定义 ====================
  writeLog('log', '保留订阅 DNS 与 hosts，不改写节点入口解析链路');

  const blackmatrix = 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule';
  // 生成 blackmatrix7 经典混合规则集（含域名与 IP-CIDR，每日更新，通过默认代理拉取）
  const classicalProvider = (name) => ({
    type: 'http', behavior: 'classical', format: 'yaml',
    url: `${blackmatrix}/Clash/${name}/${name}.yaml`,
    path: `./rule_providers/${name}.yaml`, interval: 86400, proxy: '🚀 默认代理'
  });
  // 生成 blackmatrix7 纯域名规则集（对应 Shadowrocket 的 DOMAIN-SET）
  const domainProvider = (name) => ({
    type: 'http', behavior: 'domain', format: 'yaml',
    url: `${blackmatrix}/Clash/${name}/${name}_Domain.yaml`,
    path: `./rule_providers/${name}_Domain.yaml`, interval: 86400, proxy: '🚀 默认代理'
  });

  const ruleProviders = {
    Lan: classicalProvider('Lan'),
    // Apple 与 China 均同时挂载 classical + domain 两套规则集，与小火箭保持一致
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
    // 本仓库自维护的 NSFW 文本格式规则列表
    Adult: {
      type: 'http', behavior: 'classical', format: 'text',
      url: 'https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Adult.list',
      path: './rule_providers/Adult.list', interval: 86400, proxy: '🚀 默认代理'
    },
    China: classicalProvider('China'),
    China_Domain: domainProvider('China')
  };

  // ==================== 5. 订阅依赖保留（隔离命名空间） ====================
  // 仅保留被静态节点、provider 下载、DNS、NTP、listeners 或 tunnels 实际引用的原始策略组与规则集。
  // 通过分配私有前缀名称（__subscription_group_* / __subscription_rule_*），避免与项目分流策略组及缓存路径发生冲突或篡改原依赖语义。
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
  if (config['rule-providers'] != null && (typeof config['rule-providers'] !== 'object' || Array.isArray(config['rule-providers']))) {
    throw new Error('订阅 rule-providers 格式无效，已停止生成配置。');
  }
  const originalRuleProviders = config['rule-providers'] || {};
  // 记录所有已占用策略名（静态节点 + 项目策略组 + 原订阅策略组），确保私有命名不撞名
  const policyNames = new Set([...allProxies, ...proxyGroups.map(group => group.name), ...originalGroups.keys()]);
  const retainedGroups = new Map();
  const retainedRuleProviders = new Map();
  const visiting = new Set(); // 用于递归保留策略组时的环路检测
  const builtinPolicies = new Set(['DIRECT', 'REJECT', 'REJECT-DROP', 'PASS', 'COMPATIBLE']);
  // 生成不与已用集合冲突的私有名称
  const privateName = (prefix, used) => {
    let index = 0;
    while (used.has(prefix + index)) index++;
    const name = prefix + index;
    used.add(name);
    return name;
  };
  // 递归保留原订阅策略引用（支持策略组嵌套、use、dialer-proxy 及 empty-fallback）
  const preservePolicy = name => {
    if (typeof name !== 'string' || !name) throw new Error('订阅依赖引用了无效策略。');
    if (originalGroups.has(name)) {
      if (visiting.has(name)) throw new Error('订阅依赖策略组存在循环引用。');
      if (retainedGroups.has(name)) return retainedGroups.get(name).name;
      visiting.add(name);
      const original = originalGroups.get(name);
      const retained = { ...original, name: privateName('__subscription_group_', policyNames) };
      retainedGroups.set(name, retained);
      if (original.proxies != null) {
        if (!Array.isArray(original.proxies)) throw new Error('订阅依赖策略组 proxies 格式无效。');
        retained.proxies = original.proxies.map(preservePolicy);
      }
      if (original.use) {
        if (!Array.isArray(original.use) || original.use.some(provider => !providerNameSet.has(provider))) {
          throw new Error('订阅依赖策略组引用了不存在的 proxy-provider。');
        }
        retained.use = [...original.use];
      }
      if (original['dialer-proxy'] != null) {
        retained['dialer-proxy'] = preservePolicy(original['dialer-proxy']);
      }
      if (original['empty-fallback'] != null) {
        retained['empty-fallback'] = preservePolicy(original['empty-fallback']);
      }
      visiting.delete(name);
      return retained.name;
    }
    if (staticProxyNames.has(name) || builtinPolicies.has(name)) return name;
    throw new Error('订阅依赖引用了不存在的策略。');
  };
  // 保留节点/配置对象上的链式代理（dialer-proxy）依赖
  const preserveDialer = proxy => proxy && typeof proxy === 'object' && proxy['dialer-proxy']
    ? { ...proxy, 'dialer-proxy': preservePolicy(proxy['dialer-proxy']) } : proxy;
  // 保留 provider 下载通道（proxy）、全局覆写（override）及内联 payload 中的 dialer-proxy 依赖
  const preserveDownload = provider => {
    if (!provider || typeof provider !== 'object') throw new Error('订阅依赖 Provider 格式无效。');
    const retained = { ...provider };
    if (provider.proxy) retained.proxy = preservePolicy(provider.proxy);
    if (provider.override) retained.override = preserveDialer(provider.override);
    if (Array.isArray(provider.payload)) retained.payload = provider.payload.map(preserveDialer);
    return retained;
  };
  const ruleProviderNames = new Set([...Object.keys(ruleProviders), ...Object.keys(originalRuleProviders)]);
  // 统一路径分隔符、折叠多余斜杠、去除前导 ./ 并转小写，防止在 Windows NTFS 不区分大小写文件系统下发生缓存路径碰撞
  const normalizeRulePath = filePath => filePath
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^(?:\.\/)+/, '')
    .toLowerCase();
  const usedRulePaths = new Set(Object.values(ruleProviders).map(p => p.path).filter(Boolean).map(normalizeRulePath));
  // 保留被订阅 DNS 引用的原始 rule-provider，必要时重命名并隔离本地缓存路径
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
        const ext = extMatch ? extMatch[1] : '.yaml';
        let candidate = `./rule_providers/${retainedName}${ext}`;
        let suffix = 1;
        while (usedRulePaths.has(normalizeRulePath(candidate))) {
          candidate = `./rule_providers/${retainedName}_${suffix++}${ext}`;
        }
        retainedProvider.path = candidate;
      }
      usedRulePaths.add(normalizeRulePath(retainedProvider.path));
    }
    ruleProviders[retainedName] = retainedProvider;
    return retainedName;
  };
  const preserveRuleSetList = raw => raw.split(',').map(name => preserveDnsRule(name.trim())).join(',');
  // 重写 DNS 服务器 URI 末尾 `#代理策略&参数` 中的代理名称，保留 URL 编码格式与其余查询参数
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
    // Mihomo 保留关键字 "RULES"（tunnel.DnsRespectRules）：表示该 DNS 请求遵循分流规则，需原样放行
    if (decodedProxy === 'RULES') return server;
    const retainedProxy = preservePolicy(decodedProxy);
    const nextParts = [...parts];
    nextParts[proxyIndex] = rawProxy.includes('%') ? encodeURIComponent(retainedProxy) : retainedProxy;
    return `${base}#${nextParts.join('&')}`;
  };
  const preserveDnsServers = value => Array.isArray(value) ? value.map(preserveDnsServer) : preserveDnsServer(value);
  // 判断是否为常见 DNS 域名/规则匹配前缀或模式，用于在混合 nameserver-policy 键中识别 rule-set 列表的结束边界
  const isDnsMatcherToken = token => /^(?:geosite|domain|full|regexp):/i.test(token) || /[.*+]/.test(token);
  // 改写 nameserver-policy / proxy-server-nameserver-policy 键名中嵌入的 rule-set:<name1>,<name2> 引用
  const preserveDnsPolicyKey = key => {
    if (typeof key !== 'string') return key;
    const parts = key.split(',');
    let inRuleSetList = false;
    return parts.map(part => {
      const trimmed = part.trim();
      const lower = trimmed.toLowerCase();
      if (lower.startsWith('rule-set:')) {
        inRuleSetList = true;
        return 'rule-set:' + preserveDnsRule(trimmed.slice('rule-set:'.length).trim());
      }
      if (inRuleSetList) {
        if (!Object.prototype.hasOwnProperty.call(originalRuleProviders, trimmed) && isDnsMatcherToken(trimmed)) {
          inRuleSetList = false;
          return part;
        }
        return preserveDnsRule(trimmed);
      }
      return part;
    }).join(',');
  };
  // 递归改写其他 DNS 字段（如 fake-ip-filter 默认列表模式）中的 `rule-set:...` 字符串
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
  // 处理 fake-ip-filter-mode 为 rule 时的规则格式：`RULE-SET,<规则集名>,fake-ip|real-ip`
  const preserveFakeIpFilterRule = entry => {
    if (typeof entry !== 'string') return entry;
    const parts = entry.split(',');
    if (parts.length < 3 || parts[0].trim().toUpperCase() !== 'RULE-SET') return entry;
    const nextParts = [...parts];
    nextParts[1] = preserveDnsRule(parts[1].trim());
    return nextParts.join(',');
  };
  const dnsServerListKeys = new Set(['nameserver', 'fallback', 'default-nameserver', 'proxy-server-nameserver', 'direct-nameserver']);
  const dnsPolicyMapKeys = new Set(['nameserver-policy', 'proxy-server-nameserver-policy']);
  // 完整扫描并迁移 DNS 配置中的所有策略与规则集引用，同时保留订阅原有的 DNS 结构
  const preserveDns = dnsConfig => {
    if (!dnsConfig || typeof dnsConfig !== 'object' || Array.isArray(dnsConfig)) return dnsConfig;
    const isFakeIpRuleMode = typeof dnsConfig['fake-ip-filter-mode'] === 'string' && dnsConfig['fake-ip-filter-mode'].trim().toLowerCase() === 'rule';
    return Object.fromEntries(Object.entries(dnsConfig).map(([key, value]) => {
      if (dnsServerListKeys.has(key)) return [key, preserveDnsServers(value)];
      if (key === 'fake-ip-filter' && isFakeIpRuleMode && Array.isArray(value)) {
        return [key, value.map(preserveFakeIpFilterRule)];
      }
      if (dnsPolicyMapKeys.has(key) && value && typeof value === 'object' && !Array.isArray(value)) {
        return [key, Object.fromEntries(Object.entries(value).map(([policyKey, servers]) => [
          preserveDnsPolicyKey(policyKey),
          preserveDnsServers(servers)
        ]))];
      }
      return [key, preserveDnsRuleRefs(value)];
    }));
  };
  const proxies = Array.isArray(config.proxies) ? config.proxies.map(preserveDialer) : undefined;
  const proxyProviders = config['proxy-providers'] != null ? Object.fromEntries(
    Object.entries(config['proxy-providers']).map(([name, provider]) => [name, preserveDownload(provider)])
  ) : undefined;
  const dns = preserveDns(config.dns);
  const ntp = config.ntp == null ? undefined : (() => {
    if (typeof config.ntp !== 'object' || Array.isArray(config.ntp)) {
      throw new Error('订阅 ntp 格式无效，已停止生成配置。');
    }
    return preserveDialer(config.ntp);
  })();
  // listeners 与 tunnels 均可能固定出口策略（proxy），需像 dialer-proxy 一样保留其依赖；
  // 若 listener 使用了指向 sub-rules 的 `rule` 字段，因脚本会全量重建规则且移除 sub-rules，故直接拒绝以防语义失效
  const listeners = config.listeners == null ? undefined : (() => {
    if (!Array.isArray(config.listeners)) throw new Error('订阅 listeners 格式无效，已停止生成配置。');
    return config.listeners.map(listener => {
      if (!listener || typeof listener !== 'object') throw new Error('订阅 listeners 格式无效，已停止生成配置。');
      if (listener.rule != null) throw new Error('订阅 listeners 引用了 sub-rules，脚本重建规则后无法保留，已停止生成配置。');
      return listener.proxy == null ? listener : { ...listener, proxy: preservePolicy(listener.proxy) };
    });
  })();
  const tunnels = config.tunnels == null ? undefined : (() => {
    if (!Array.isArray(config.tunnels)) throw new Error('订阅 tunnels 格式无效，已停止生成配置。');
    return config.tunnels.map(tunnel => {
      if (typeof tunnel === 'string') {
        // 兼容紧凑字符串格式：`network,address,target[,proxy]`
        const parts = tunnel.split(',');
        if (parts.length !== 4) return tunnel;
        parts[3] = preservePolicy(parts[3].trim());
        return parts.join(',');
      }
      if (!tunnel || typeof tunnel !== 'object') throw new Error('订阅 tunnels 格式无效，已停止生成配置。');
      return tunnel.proxy == null ? tunnel : { ...tunnel, proxy: preservePolicy(tunnel.proxy) };
    });
  })();
  // ==================== 6. 原子提交配置与持久化选项 ====================
  // 待全部依赖校验通过后再统一写回 config，确保任何校验失败都不会导致输入配置被半改写
  config['proxy-groups'] = [...proxyGroups, ...retainedGroups.values()];
  config['rule-providers'] = ruleProviders;
  if (proxies) config.proxies = proxies;
  if (proxyProviders) config['proxy-providers'] = proxyProviders;
  if (dns !== undefined) config.dns = dns;
  if (ntp !== undefined) config.ntp = ntp;
  if (listeners) config.listeners = listeners;
  if (tunnels) config.tunnels = tunnels;
  // sub-rules 仅能由原订阅的 rules 触发；规则被全量替换后已无入口，予以清理
  delete config['sub-rules'];
  // 开启策略组选择记忆与 fake-ip 缓存持久化
  config.profile = Object.assign({}, config.profile || {}, { 'store-selected': true, 'store-fake-ip': true });

  // ==================== 7. 分流规则（与 Shadowrocket 保持严格一致） ====================
  // 所有基于 classical 规则集的 RULE-SET 均附带 no-resolve，避免在纯域名规则匹配前触发额外 DNS 解析；
  // 末尾 GEOIP,CN,DIRECT 不加 no-resolve，以实现域名未命中时的境内 IP 直连兜底。
  config.rules = [
    // 局域网及高优先级直连
    'RULE-SET,Lan,DIRECT,no-resolve',
    'DOMAIN-SUFFIX,deepseek.com,DIRECT',
    // >>> BEGIN AI RULES (generated from rules/ai-rules.json; run `node scripts/sync-ai-rules.js`) >>>
    // OpenAI / ChatGPT
    'DOMAIN-SUFFIX,chat.com,🤖 AI',
    'DOMAIN-SUFFIX,chatgpt.com,🤖 AI',
    'DOMAIN-SUFFIX,chatgpt.site,🤖 AI',
    'DOMAIN-SUFFIX,crixet.com,🤖 AI',
    'DOMAIN-SUFFIX,oaistatic.com,🤖 AI',
    'DOMAIN-SUFFIX,oaiusercontent.com,🤖 AI',
    'DOMAIN-SUFFIX,openai.com,🤖 AI',
    'DOMAIN-SUFFIX,openai.org,🤖 AI',
    'DOMAIN-SUFFIX,oaistatsig.com,🤖 AI',
    'DOMAIN-SUFFIX,sora.com,🤖 AI',
    'DOMAIN,cdn.openaimerge.com,🤖 AI',
    'DOMAIN,o207216.ingest.sentry.io,🤖 AI',
    'DOMAIN,o33249.ingest.sentry.io,🤖 AI',
    'DOMAIN,o33249.ingest.us.sentry.io,🤖 AI',
    'DOMAIN,openai.com.cdn.cloudflare.net,🤖 AI',
    'DOMAIN,openaiapi-site.azureedge.net,🤖 AI',
    'DOMAIN,openaiassets.blob.core.windows.net,🤖 AI',
    'DOMAIN,openaicom-api-bdcpf8c6d2e9atf6.z01.azurefd.net,🤖 AI',
    'DOMAIN,openaicom.imgix.net,🤖 AI',
    'DOMAIN,openaicomproductionae4b.blob.core.windows.net,🤖 AI',
    'DOMAIN,production-openaicom-storage.azureedge.net,🤖 AI',
    'DOMAIN-WILDCARD,chatgpt-async-webps-prod-*.webpubsub.azure.com,🤖 AI',
    // OpenAI 共享依赖（WorkOS、Intercom、Stripe、Cloudflare、Apple、Datadog）保持正常分流。
    // 个人 AI 中转
    'DOMAIN-SUFFIX,a6api.vip,🤖 AI',
    'DOMAIN-SUFFIX,a6api.com,🤖 AI',
    // Exa / Tavily / Jina
    'DOMAIN-SUFFIX,exa.ai,🤖 AI',
    'DOMAIN-SUFFIX,tavily.com,🤖 AI',
    'DOMAIN-SUFFIX,jina.ai,🤖 AI',
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
    'DOMAIN-SUFFIX,grok.x.com,🤖 AI',
    'DOMAIN-SUFFIX,grokbot.com,🤖 AI',
    'DOMAIN-SUFFIX,grokusercontent.com,🤖 AI',
    'DOMAIN-SUFFIX,grok-sandbox.com,🤖 AI',
    'DOMAIN-SUFFIX,groktpcontent.com,🤖 AI',
    'DOMAIN-SUFFIX,grok.me,🤖 AI',
    'DOMAIN-SUFFIX,grokipedia.com,🤖 AI',
    // Claude / Anthropic
    'DOMAIN-SUFFIX,ant.dev,🤖 AI',
    'DOMAIN-SUFFIX,anthropic.com,🤖 AI',
    'DOMAIN-SUFFIX,anthropic.team,🤖 AI',
    'DOMAIN-SUFFIX,chatbotclaude.com,🤖 AI',
    'DOMAIN-SUFFIX,clau.de,🤖 AI',
    'DOMAIN-SUFFIX,claude.ai,🤖 AI',
    'DOMAIN-SUFFIX,claude.app,🤖 AI',
    'DOMAIN-SUFFIX,claude.com,🤖 AI',
    'DOMAIN-SUFFIX,claude.dev,🤖 AI',
    'DOMAIN-SUFFIX,claude.new,🤖 AI',
    'DOMAIN-SUFFIX,claude.site,🤖 AI',
    'DOMAIN-SUFFIX,claudeacademy.com,🤖 AI',
    'DOMAIN-SUFFIX,claudemcpclient.com,🤖 AI',
    'DOMAIN-SUFFIX,claudemcpcontent.com,🤖 AI',
    'DOMAIN-SUFFIX,claudepages.dev,🤖 AI',
    'DOMAIN-SUFFIX,claudestudio.com,🤖 AI',
    'DOMAIN-SUFFIX,claudeusercontent.com,🤖 AI',
    'DOMAIN,servd-anthropic-website.b-cdn.net,🤖 AI',
    'DOMAIN,o1158394.ingest.us.sentry.io,🤖 AI',
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
    // Apple 与 Microsoft 生态服务
    'RULE-SET,Apple,🍎 Apple,no-resolve','RULE-SET,Apple_Domain,🍎 Apple','RULE-SET,Microsoft,🪟 Microsoft,no-resolve',
    // 开发工具与技术资料站点
    'RULE-SET,GitHub,💻 开发工具,no-resolve',
    'DOMAIN-SUFFIX,docker.io,💻 开发工具','DOMAIN-SUFFIX,docker.com,💻 开发工具','DOMAIN-SUFFIX,dhi.io,💻 开发工具',
    'DOMAIN-SUFFIX,stackoverflow.com,💻 开发工具','DOMAIN-SUFFIX,sstatic.net,💻 开发工具',
    'DOMAIN-SUFFIX,gitlab.com,💻 开发工具','DOMAIN-SUFFIX,gitlab-static.net,💻 开发工具',
    'DOMAIN-SUFFIX,pypi.org,💻 开发工具','DOMAIN-SUFFIX,pythonhosted.org,💻 开发工具',
    'DOMAIN-SUFFIX,wikipedia.org,💻 开发工具','DOMAIN-SUFFIX,wikimedia.org,💻 开发工具',
    'DOMAIN-SUFFIX,hero-sms.com,💻 开发工具','DOMAIN-SUFFIX,greasyfork.org,💻 开发工具',
    // 即时通讯与字节跳动国内服务直连（置于 TikTok 前以防误走代理）
    'RULE-SET,Telegram,✈️ Telegram,no-resolve',
    'DOMAIN-SUFFIX,bytedance.com,DIRECT','DOMAIN-SUFFIX,bytedance.net,DIRECT',
    // 社交媒体、流媒体与 Google 搜索
    'RULE-SET,Twitter,📱 社交媒体,no-resolve','RULE-SET,Instagram,📱 社交媒体,no-resolve','RULE-SET,TikTok,📱 社交媒体,no-resolve','RULE-SET,YouTube,▶️ YouTube,no-resolve','RULE-SET,Google,🔎 Google,no-resolve',
    // NSFW 内容分流
    'RULE-SET,Adult,🔞 NSFW,no-resolve',
    // 中国大陆规则集、境内 IP 直连及最终兜底策略
    'RULE-SET,China,DIRECT,no-resolve','RULE-SET,China_Domain,DIRECT','GEOIP,CN,DIRECT','MATCH,🐟 漏网之鱼'
  ];

  writeLog('log', `完成：策略组=${config['proxy-groups'].length}，规则集=${Object.keys(config['rule-providers']).length}，规则=${config.rules.length}，DNS/hosts=继承订阅`);
  return config;
}
