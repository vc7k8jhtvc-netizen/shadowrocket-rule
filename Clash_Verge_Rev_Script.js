/**
 * Clash Verge Rev 订阅扩展脚本 (Script)
 * 基于 shadowrocket-rule v2.6.5 策略转换
 *
 * 原理与优势：
 * 1. 继承原项目架构：“节点来源与分流逻辑分离”。
 * 2. 自动清空机场订阅中自带的杂乱策略组和规则，接管为本项目严格定义的策略组和分层规则。
 * 3. 同时兼容 proxies 与 proxy-providers，通过节点名称划分地区节点池。
 * 4. 与 Shadowrocket 版本并行维护主要策略组、规则优先级和 Global.list。
 */

function main(config) {
  const logPrefix = '[shadowrocket-rule]';
  const writeLog = (level, message) => {
    if (typeof console === 'undefined') return;
    const output = typeof console[level] === 'function' ? console[level] : console.log;
    if (typeof output === 'function') output.call(console, `${logPrefix} ${message}`);
  };

  writeLog('log', '开始生成 Clash Verge Rev 配置');

  // 1. 获取机场订阅中解析出来的所有实际节点名称
  const allProxies = (config.proxies || [])
    .map(p => p && p.name)
    .filter(Boolean);
  const providerNames = Object.keys(config['proxy-providers'] || {});
  writeLog('log', `节点来源：proxies=${allProxies.length}，proxy-providers=${providerNames.length}`);

  if (allProxies.length === 0 && providerNames.length === 0) {
    const message = '订阅中没有可用的 proxies 或 proxy-providers，已停止生成配置以避免静默直连。';
    writeLog('error', message);
    throw new Error(message);
  }

  // 正则过滤提取对应地区节点名称
  const filterNodes = (regex) => allProxies.filter(name => regex.test(name));

  const regionPatterns = {
    hk: /Hong Kong|香港|🇭🇰/i,
    tw: /Taiwan|台湾|臺灣|🇹🇼/i,
    sg: /Singapore|新加坡|狮城|獅城|🇸🇬/i,
    jp: /Japan|日本|东京|東京|大阪|🇯🇵/i,
    us: /United States|美国|美國|USA|洛杉矶|洛杉磯|西雅图|西雅圖|🇺🇸/i
  };
  const regionMatches = {
    hk: filterNodes(regionPatterns.hk),
    tw: filterNodes(regionPatterns.tw),
    sg: filterNodes(regionPatterns.sg),
    jp: filterNodes(regionPatterns.jp),
    us: filterNodes(regionPatterns.us)
  };
  writeLog(
    'log',
    `地区匹配：香港=${regionMatches.hk.length}，台湾=${regionMatches.tw.length}，新加坡=${regionMatches.sg.length}，日本=${regionMatches.jp.length}，美国=${regionMatches.us.length}`
  );

  const regionalGroup = (name, regex, matchedNodes) => {
    const group = {
      name,
      type: 'select',
      'empty-fallback': 'REJECT'
    };

    if (matchedNodes.length > 0) {
      group.proxies = matchedNodes;
    }
    if (providerNames.length > 0) {
      group.use = providerNames;
      // RegExp.source 不包含 JavaScript 的 /i 标志；Mihomo 使用内联标志保留忽略大小写语义。
      group.filter = `(?i)${regex.source}`;
    }
    if (matchedNodes.length === 0 && providerNames.length === 0) {
      group.proxies = ['🌐 全部节点'];
      writeLog('warn', `${name}未匹配到节点，使用“🌐 全部节点”兜底`);
    }

    return group;
  };

  const allNodesGroup = {
    name: '🌐 全部节点',
    type: 'select'
  };
  if (allProxies.length > 0) allNodesGroup.proxies = allProxies;
  if (providerNames.length > 0) allNodesGroup.use = providerNames;

  // 2. 重建地区节点池与业务策略组
  config['proxy-groups'] = [
    // ----- 地区节点池 -----
    allNodesGroup,
    regionalGroup('🇭🇰 香港', regionPatterns.hk, regionMatches.hk),
    regionalGroup('🇹🇼 台湾', regionPatterns.tw, regionMatches.tw),
    regionalGroup('🇸🇬 新加坡', regionPatterns.sg, regionMatches.sg),
    regionalGroup('🇯🇵 日本', regionPatterns.jp, regionMatches.jp),
    regionalGroup('🇺🇸 美国', regionPatterns.us, regionMatches.us),

    // ----- 控制总控组 -----
    {
      name: '🚀 默认代理',
      type: 'select',
      proxies: ['🇭🇰 香港', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国', '🇹🇼 台湾', '🌐 全部节点']
    },

    // ----- 业务策略组 -----
    {
      name: '🤖 AI',
      type: 'select',
      proxies: ['🇺🇸 美国', '🇸🇬 新加坡', '🇯🇵 日本', '🚀 默认代理']
    },
    {
      name: '🍎 Apple',
      type: 'select',
      proxies: ['DIRECT', '🚀 默认代理', '🇭🇰 香港', '🇺🇸 美国', '🇯🇵 日本', '🌐 全部节点']
    },
    {
      name: '🌐 Google',
      type: 'select',
      proxies: ['🚀 默认代理', '🇺🇸 美国', '🇯🇵 日本', '🇸🇬 新加坡']
    },
    {
      name: '💻 GitHub',
      type: 'select',
      proxies: ['🚀 默认代理', '🇺🇸 美国']
    },
    {
      name: '🪟 Microsoft',
      type: 'select',
      proxies: ['DIRECT', '🚀 默认代理', '🇺🇸 美国', '🌐 全部节点']
    },
    {
      name: '📱 社交',
      type: 'select',
      proxies: ['🚀 默认代理', '🇺🇸 美国', '🇸🇬 新加坡', '🇯🇵 日本']
    },
    {
      name: '▶️ YouTube',
      type: 'select',
      proxies: ['🚀 默认代理', '🇯🇵 日本', '🇺🇸 美国', '🇸🇬 新加坡']
    },
    {
      name: '📲 Telegram',
      type: 'select',
      proxies: ['🚀 默认代理', '🇸🇬 新加坡', '🇭🇰 香港', '🇯🇵 日本']
    },
    {
      name: '🌍 Global',
      type: 'select',
      proxies: ['🚀 默认代理', '🇺🇸 美国', '🇯🇵 日本', '🇸🇬 新加坡']
    },
    {
      name: '🐟 FINAL',
      type: 'select',
      proxies: ['DIRECT', '🚀 默认代理', '🌐 全部节点']
    }
  ];

  // 3. 保留订阅原有的 hosts、DNS 和节点入口参数。
  // 仅设置分流模式与策略选择持久化，不改写节点连接所依赖的解析链路。
  writeLog('log', '保留订阅 DNS 与 hosts，不改写节点入口解析链路');

  config.mode = 'rule';
  config.profile = Object.assign({}, config.profile || {}, {
    'store-selected': true,
    'store-fake-ip': true
  });

  // 4. 配置远程规则集。Global.list 由两个客户端共用，避免复制后漂移。
  const blackmatrix = 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule';
  const classicalProvider = (name) => ({
    type: 'http',
    behavior: 'classical',
    format: 'yaml',
    url: `${blackmatrix}/Clash/${name}/${name}.yaml`,
    path: `./rule_providers/${name}.yaml`,
    interval: 86400,
    proxy: '🚀 默认代理'
  });

  config['rule-providers'] = {
    Lan: classicalProvider('Lan'),
    Apple: classicalProvider('Apple'),
    Apple_Domain: {
      type: 'http',
      behavior: 'domain',
      format: 'text',
      url: `${blackmatrix}/Shadowrocket/Apple/Apple_Domain.list`,
      path: './rule_providers/Apple_Domain.list',
      interval: 86400,
      proxy: '🚀 默认代理'
    },
    Microsoft: classicalProvider('Microsoft'),
    GitHub: classicalProvider('GitHub'),
    Telegram: classicalProvider('Telegram'),
    Twitter: classicalProvider('Twitter'),
    Instagram: classicalProvider('Instagram'),
    TikTok: classicalProvider('TikTok'),
    YouTube: classicalProvider('YouTube'),
    Google: classicalProvider('Google'),
    Global: {
      type: 'http',
      behavior: 'classical',
      format: 'text',
      url: 'https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Global.list',
      path: './rule_providers/Global.list',
      interval: 86400,
      proxy: '🚀 默认代理'
    },
    China: classicalProvider('China'),
    China_Domain: {
      type: 'http',
      behavior: 'domain',
      format: 'text',
      url: `${blackmatrix}/Shadowrocket/China/China_Domain.list`,
      path: './rule_providers/China_Domain.list',
      interval: 86400,
      proxy: '🚀 默认代理'
    }
  };

  // 6. 覆盖重写分流规则（严格保持优先级）
  config.rules = [
    // 1. 局域网直连
    'RULE-SET,Lan,DIRECT',

    // 2. AI 专项服务（GPT / Gemini / Grok）
    // OpenAI / ChatGPT 官方通配
    'DOMAIN-SUFFIX,chatgpt.com,🤖 AI',
    'DOMAIN-SUFFIX,ct.sendgrid.net,🤖 AI',
    'DOMAIN-SUFFIX,intercom.io,🤖 AI',
    'DOMAIN-SUFFIX,intercomcdn.com,🤖 AI',
    'DOMAIN-SUFFIX,oaistatic.com,🤖 AI',
    'DOMAIN-SUFFIX,oaiusercontent.com,🤖 AI',
    'DOMAIN-SUFFIX,openai.com,🤖 AI',
    'DOMAIN-SUFFIX,oaistatsig.com,🤖 AI',

    // OpenAI 官方精确第三方依赖
    'DOMAIN,cdn.openaimerge.com,🤖 AI',
    'DOMAIN,cdn.workos.com,🤖 AI',
    'DOMAIN,challenges.cloudflare.com,🤖 AI',
    'DOMAIN,forwarder.workos.com,🤖 AI',
    'DOMAIN,humb.apple.com,🤖 AI',
    'DOMAIN,images.workoscdn.com,🤖 AI',
    'DOMAIN,js.stripe.com,🤖 AI',
    'DOMAIN,o207216.ingest.sentry.io,🤖 AI',
    'DOMAIN,o33249.ingest.sentry.io,🤖 AI',
    'DOMAIN,rum.browser-intake-datadoghq.com,🤖 AI',
    'DOMAIN,setup.workos.com,🤖 AI',
    'DOMAIN,workos.imgix.net,🤖 AI',

    // Gemini / Google AI（必须在 Google 规则之前）
    'DOMAIN,gemini.google.com,🤖 AI',
    'DOMAIN-SUFFIX,ai.google,🤖 AI',
    'DOMAIN,generativelanguage.googleapis.com,🤖 AI',

    // Grok / xAI
    'DOMAIN-SUFFIX,x.ai,🤖 AI',
    'DOMAIN-SUFFIX,grok.com,🤖 AI',

    // 3. 专项服务规则
    'RULE-SET,Apple,🍎 Apple',
    'RULE-SET,Apple_Domain,🍎 Apple',
    'RULE-SET,Microsoft,🪟 Microsoft',
    'RULE-SET,GitHub,💻 GitHub',
    'RULE-SET,Telegram,📲 Telegram',

    // 字节跳动大陆直连（必须在 TikTok 之前）
    'DOMAIN-SUFFIX,bytedance.com,DIRECT',
    'DOMAIN-SUFFIX,bytedance.net,DIRECT',

    // 社交服务
    'RULE-SET,Twitter,📱 社交',
    'RULE-SET,Instagram,📱 社交',
    'RULE-SET,TikTok,📱 社交',

    // 视频与搜索
    'RULE-SET,YouTube,▶️ YouTube',
    'RULE-SET,Google,🌐 Google',

    // 4. 与 Shadowrocket 共用同一份个人 Global 规则
    'RULE-SET,Global,🌍 Global',

    // 5. 中国大陆直连
    'RULE-SET,China,DIRECT',
    'RULE-SET,China_Domain,DIRECT',
    'GEOIP,CN,DIRECT,no-resolve',

    // 6. 兜底
    'MATCH,🐟 FINAL'
  ];

  writeLog(
    'log',
    `完成：策略组=${config['proxy-groups'].length}，规则集=${Object.keys(config['rule-providers']).length}，规则=${config.rules.length}，DNS/hosts=继承订阅`
  );
  return config;
}
