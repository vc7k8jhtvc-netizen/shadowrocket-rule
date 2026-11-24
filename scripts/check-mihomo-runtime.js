// Isolated synthetic configurations; never reads a private subscription or dials real nodes.
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const net = require('net');
const dgram = require('dgram');
const { spawn, spawnSync } = require('child_process');
const { once } = require('events');

const binary = process.argv[2];
if (!binary) throw new Error('usage: node check-mihomo-runtime.js /path/to/mihomo');
const ctx = { console: { log() {}, warn() {}, error() {} } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'Clash_Verge_Rev_Script.js'), 'utf8'), ctx);
const assert = (ok, message) => { if (!ok) throw new Error(message); };
async function freePort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

const root = path.resolve(__dirname, '..');
const localListFiles = {
  Custom: path.join(root, 'Custom.list'),
  Adult: path.join(root, 'Adult.list'),
  OpenAI_Voice: path.join(root, 'OpenAI_Voice.list')
};

async function startTagSink(tag) {
  const server = net.createServer(socket => {
    let buffer = '';
    const respond = () => {
      const body = tag;
      socket.end(`HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${Buffer.byteLength(body)}\r\nConnection: close\r\n\r\n${body}`);
    };
    socket.on('data', chunk => {
      buffer += chunk.toString('utf8');
      if (!buffer.includes('\r\n\r\n')) return;
      if (buffer.startsWith('CONNECT ')) {
        const end = buffer.indexOf('\r\n\r\n') + 4;
        buffer = buffer.slice(end);
        socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        if (buffer.includes('\r\n\r\n')) respond();
      } else {
        respond();
      }
    });
    socket.on('error', () => {});
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { server, port: server.address().port };
}

function sendProxyRequest(proxyPort, targetUrl, hostHeader) {
  return new Promise((resolve, reject) => {
    let raw = '';
    const socket = net.connect(proxyPort, '127.0.0.1', () => {
      socket.write(`GET ${targetUrl} HTTP/1.1\r\nHost: ${hostHeader}\r\nConnection: close\r\n\r\n`);
    });
    socket.setTimeout(3000, () => {
      socket.destroy();
      reject(new Error('proxy routing request timed out for ' + hostHeader));
    });
    socket.on('data', chunk => { raw += chunk.toString('utf8'); });
    socket.on('error', reject);
    socket.on('close', () => {
      const sep = raw.indexOf('\r\n\r\n');
      resolve(sep === -1 ? raw.trim() : raw.slice(sep + 4).trim());
    });
  });
}

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mihomo-audit-'));
  const dns = dgram.createSocket('udp4');
  let queries = 0;
  dns.on('message', () => { queries++; });
  dns.bind(0, '127.0.0.1');
  await once(dns, 'listening');
  let child;
  let routeChild;
  const sinks = [];
  let logs = '';
  try {
    const fixtureNode = { name: 'Hong Kong | Dependency', type: 'ss', server: '127.0.0.1', port: 1, cipher: 'aes-128-gcm', password: 'test-only' };
    const dependencyInput = {
      mode: 'rule',
      proxies: [{ ...fixtureNode, 'dialer-proxy': '🚀 默认代理' }],
      'proxy-groups': [
        { name: '🚀 默认代理', type: 'select', proxies: ['Transport'] },
        { name: 'Transport', type: 'select', proxies: ['DIRECT'] },
        { name: 'DnsExit', type: 'select', proxies: ['DIRECT'] }
      ],
      'proxy-providers': { Fixture: { type: 'inline', payload: [{ ...fixtureNode, name: 'Singapore | Provider', 'dialer-proxy': 'Transport' }], override: { 'dialer-proxy': 'Transport' } } },
      dns: {
        enable: true,
        nameserver: ['1.1.1.1', 'https://dns.google/dns-query#DnsExit&h3=true', 'https://dns.google/dns-query#RULES'],
        'nameserver-policy': {
          'rule-set:China,SubscriptionDomain': ['1.1.1.1', 'https://dns.google/dns-query#Transport'],
          'example.com,rule-set:SubscriptionDomain': 'https://dns.google/dns-query#DnsExit'
        },
        'fake-ip-filter': ['rule-set:SubscriptionDomain']
      },
      // Mihomo resolves ntp dialer-proxy, tunnel exits and sub-rules at load time; the script must keep them loadable.
      ntp: { enable: true, server: 'time.apple.com', port: 123, 'dialer-proxy': 'Transport' },
      tunnels: [{ network: ['tcp'], address: '127.0.0.1:1', target: 'audit.invalid:80', proxy: 'Transport' }],
      'sub-rules': { Orphan: ['MATCH,DnsExit'] },
      'rule-providers': {
        China: { type: 'inline', behavior: 'domain', payload: ['+.fixture.invalid'] },
        SubscriptionDomain: { type: 'inline', behavior: 'domain', payload: ['+.subscription.invalid'] }
      },
      rules: ['MATCH,REJECT']
    };
    const dependencyOutput = ctx.main(JSON.parse(JSON.stringify(dependencyInput)));
    const stageLocalLists = baseDir => {
      const targetDir = path.join(baseDir, 'rule_providers');
      fs.mkdirSync(targetDir, { recursive: true });
      for (const srcPath of Object.values(localListFiles)) {
        fs.copyFileSync(srcPath, path.join(targetDir, path.basename(srcPath)));
      }
    };
    stageLocalLists(dir);
    const offlineProviders = config => {
      for (const [name, provider] of Object.entries(config['rule-providers'])) {
        if (provider.type === 'inline') continue;
        if (localListFiles[name]) {
          config['rule-providers'][name] = {
            type: 'file', behavior: provider.behavior, format: provider.format, path: provider.path
          };
          continue;
        }
        config['rule-providers'][name] = {
          type: 'inline', behavior: provider.behavior,
          payload: provider.behavior === 'domain' ? ['+.audit.invalid'] : ['DOMAIN-SUFFIX,audit.invalid']
        };
      }
      config.rules = config.rules.filter(rule => !rule.startsWith('GEOIP,'));
    };
    // Mount real repository text rule-sets directly via file providers inside Mihomo's home dir (SAFE_PATHS).
    offlineProviders(dependencyOutput);
    const ruleModeInput = {
      mode: 'rule',
      proxies: [fixtureNode],
      'proxy-groups': [{ name: 'NtpExit', type: 'select', proxies: ['DIRECT'] }],
      ntp: { enable: true, server: 'time.apple.com', port: 123, 'dialer-proxy': 'NtpExit' },
      dns: {
        enable: true,
        'enhanced-mode': 'fake-ip',
        'fake-ip-filter-mode': 'rule',
        nameserver: ['1.1.1.1'],
        'fake-ip-filter': ['RULE-SET,RuleModeDomain,real-ip', 'MATCH,fake-ip']
      },
      'rule-providers': {
        RuleModeDomain: { type: 'inline', behavior: 'domain', payload: ['+.rulemode.invalid'] }
      },
      rules: ['MATCH,REJECT']
    };
    const ruleModeOutput = ctx.main(JSON.parse(JSON.stringify(ruleModeInput)));
    offlineProviders(ruleModeOutput);
    for (const [label, input] of [
      ['before', dependencyInput],
      ['after', dependencyOutput],
      ['rule-mode-before', ruleModeInput],
      ['rule-mode-after', ruleModeOutput]
    ]) {
      const fixturePath = path.join(dir, 'dependencies-' + label + '.json');
      fs.writeFileSync(fixturePath, JSON.stringify(input));
      const checked = spawnSync(binary, ['-t', '-d', dir, '-f', fixturePath], { encoding: 'utf8', timeout: 10000 });
      assert(checked.status === 0, 'Mihomo subscription dependency validation failed (' + label + '):\n' + checked.stdout + checked.stderr);
    }
    console.log('PASS: Mihomo loads preserved dialer/provider/ntp/tunnel groups, DNS RULES tag, rule-mode fake-ip-filter, DNS rule-set dependencies and local text rule files');
    const apiPort = await freePort();
    const proxyPort = await freePort();
    const output = ctx.main({ 'proxy-providers': { Test: { type: 'inline', payload: [
      { name: 'unmatched-test-node', type: 'ss', server: '127.0.0.1', port: 1, cipher: 'aes-128-gcm', password: 'test-only' }
    ] } } });
    // Keep every generated rule before GEOIP,CN and inject IP-CIDR into every Blackmatrix classical provider
    // so any missing no-resolve on LAN/Apple/Microsoft/GitHub/Telegram/Twitter/Instagram/TikTok/YouTube/Google/Custom/Adult/OpenAI_Voice/China triggers DNS.
    for (const [name, provider] of Object.entries(output['rule-providers'])) {
      output['rule-providers'][name] = {
        type: 'inline',
        behavior: provider.behavior,
        payload: provider.behavior === 'domain'
          ? ['+.audit.invalid']
          : ['IP-CIDR,10.0.0.0/8']
      };
    }
    output.rules = [...output.rules.filter(rule => !rule.startsWith('GEOIP,') && !rule.startsWith('MATCH,')), 'MATCH,REJECT'];
    output.dns = { enable: true, 'enhanced-mode': 'redir-host', nameserver: ['udp://127.0.0.1:' + dns.address().port] };
    output['external-controller'] = '127.0.0.1:' + apiPort;
    output['mixed-port'] = proxyPort;
    output['allow-lan'] = false;
    const config = path.join(dir, 'config.json');
    fs.writeFileSync(config, JSON.stringify(output));
    child = spawn(binary, ['-d', dir, '-f', config], { stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', data => { logs += data; });
    child.stderr.on('data', data => { logs += data; });
    let groups;
    for (let attempt = 0; attempt < 50; attempt++) {
      if (child.exitCode !== null) throw new Error('Mihomo stopped before API readiness');
      try {
        const response = await fetch('http://127.0.0.1:' + apiPort + '/proxies', { signal: AbortSignal.timeout(300) });
        if (response.ok) { groups = (await response.json()).proxies; break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert(groups, 'Mihomo API did not become ready');
    for (const name of ['👆 手动选择', '🇭🇰 香港', '🏝️ 台湾', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国']) {
      assert(groups[name].now === 'REJECT' && JSON.stringify(groups[name].all) === '["REJECT"]', 'empty filtered group is not blocked: ' + name);
    }
    // Domain-only HTTP proxy traffic must traverse all pre-GEOIP rules and reach REJECT without querying DNS.
    await new Promise((resolve, reject) => {
      const socket = net.connect(proxyPort, '127.0.0.1', () => socket.write('GET http://audit.example.invalid/ HTTP/1.1\r\nHost: audit.example.invalid\r\nConnection: close\r\n\r\n'));
      socket.setTimeout(2000, () => {
        socket.destroy();
        reject(new Error(queries > 0
          ? 'LAN unexpectedly triggered DNS before domain routing (pre-GEOIP RULE-SET resolved DNS)'
          : 'domain request stalled before REJECT'));
      });
      socket.on('data', () => {});
      socket.on('error', reject);
      socket.on('close', resolve);
    });
    assert(queries === 0, 'LAN unexpectedly triggered DNS before domain routing (pre-GEOIP RULE-SET resolved DNS)');
    console.log('PASS: Mihomo rejects empty provider groups and pre-GEOIP rules perform no early DNS lookup');

    // End-to-end offline routing verification with real local text rule files (Custom/Adult/OpenAI_Voice) and DOMAIN-WILDCARD rules.
    const sgSink = await startTagSink('SG'); sinks.push(sgSink.server);
    const hkSink = await startTagSink('HK'); sinks.push(hkSink.server);
    const twSink = await startTagSink('TW'); sinks.push(twSink.server);
    const jpSink = await startTagSink('JP'); sinks.push(jpSink.server);
    const usSink = await startTagSink('US'); sinks.push(usSink.server);
    const directSink = await startTagSink('DIRECT'); sinks.push(directSink.server);

    const routeApiPort = await freePort();
    const routeProxyPort = await freePort();
    const routeConfig = ctx.main({
      mode: 'rule',
      hosts: { 'canva.cn': '127.0.0.1' },
      proxies: [
        { name: 'Hong Kong | HK-Sink', type: 'http', server: '127.0.0.1', port: hkSink.port },
        { name: 'Taiwan | TW-Sink', type: 'http', server: '127.0.0.1', port: twSink.port },
        { name: 'Singapore | SG-Sink', type: 'http', server: '127.0.0.1', port: sgSink.port },
        { name: 'Japan | JP-Sink', type: 'http', server: '127.0.0.1', port: jpSink.port },
        { name: 'United States | US-Sink', type: 'http', server: '127.0.0.1', port: usSink.port }
      ]
    });
    for (const [name, provider] of Object.entries(routeConfig['rule-providers'])) {
      if (localListFiles[name]) {
        routeConfig['rule-providers'][name] = {
          type: 'file', behavior: provider.behavior, format: provider.format, path: provider.path
        };
      } else if (name === 'Twitter') {
        routeConfig['rule-providers'][name] = { type: 'inline', behavior: 'classical', payload: ['DOMAIN-SUFFIX,x.com'] };
      } else if (name === 'Google') {
        routeConfig['rule-providers'][name] = { type: 'inline', behavior: 'classical', payload: ['DOMAIN-SUFFIX,googleapis.com', 'DOMAIN-SUFFIX,google.com'] };
      } else {
        routeConfig['rule-providers'][name] = {
          type: 'inline', behavior: provider.behavior,
          payload: provider.behavior === 'domain' ? ['+.audit.invalid'] : ['DOMAIN-SUFFIX,audit.invalid']
        };
      }
    }
    routeConfig.rules = routeConfig.rules.filter(rule => !rule.startsWith('GEOIP,'));
    routeConfig.profile = { 'store-selected': false, 'store-fake-ip': false };
    routeConfig['external-controller'] = '127.0.0.1:' + routeApiPort;
    routeConfig['mixed-port'] = routeProxyPort;
    routeConfig['allow-lan'] = false;

    const routeDir = path.join(dir, 'routing');
    fs.mkdirSync(routeDir);
    stageLocalLists(routeDir);
    const routeConfigPath = path.join(routeDir, 'config.json');
    fs.writeFileSync(routeConfigPath, JSON.stringify(routeConfig));
    routeChild = spawn(binary, ['-d', routeDir, '-f', routeConfigPath], { stdio: ['ignore', 'pipe', 'pipe'] });
    routeChild.stdout.on('data', data => { logs += data; });
    routeChild.stderr.on('data', data => { logs += data; });

    let routeReady = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      if (routeChild.exitCode !== null) throw new Error('Mihomo routing instance stopped before API readiness');
      try {
        const response = await fetch('http://127.0.0.1:' + routeApiPort + '/proxies', { signal: AbortSignal.timeout(300) });
        if (response.ok) { routeReady = true; break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert(routeReady, 'Mihomo routing API did not become ready');

    // Pin distinct regions on non-AI groups so each policy decision produces a distinct tag.
    for (const [groupName, target] of [
      ['🔎 Google', '🇯🇵 日本'],
      ['📱 社交媒体', '🇯🇵 日本'],
      ['🧩 自定义', '🏝️ 台湾'],
      ['🔞 NSFW', '🇺🇸 美国']
    ]) {
      const response = await fetch(`http://127.0.0.1:${routeApiPort}/proxies/${encodeURIComponent(groupName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: target })
      });
      assert(response.ok, `failed to switch Mihomo group ${groupName} -> ${target}: HTTP ${response.status}`);
    }

    const voiceFirstIp = fs.readFileSync(localListFiles.OpenAI_Voice, 'utf8')
      .split(/\r?\n/).find(line => line.startsWith('IP-CIDR,')).split(',')[1].split('/')[0];
    const routeCases = [
      ['http://us-central1-aiplatform.googleapis.com/', 'us-central1-aiplatform.googleapis.com', 'SG', 'Vertex AI DOMAIN-WILDCARD'],
      ['http://chatgpt-async-webps-prod-eastus.webpubsub.azure.com/', 'chatgpt-async-webps-prod-eastus.webpubsub.azure.com', 'SG', 'OpenAI WebPubSub DOMAIN-WILDCARD'],
      ['http://grok.x.com/', 'grok.x.com', 'SG', 'Grok x.com precedes Twitter'],
      ['http://x.com/', 'x.com', 'JP', 'Twitter x.com remains social media'],
      ['http://jnn-pa.googleapis.com/', 'jnn-pa.googleapis.com', 'JP', 'Shared Google BotGuard stays on Google'],
      ['http://waa-pa.clients6.google.com/', 'waa-pa.clients6.google.com', 'JP', 'Shared Google WAA stays on Google'],
      [`http://${voiceFirstIp}/`, voiceFirstIp, 'SG', 'OpenAI_Voice.list host IP routes to AI'],
      ['http://wikipedia.org/', 'wikipedia.org', 'TW', 'Custom.list routes to Custom'],
      ['http://jable.tv/', 'jable.tv', 'US', 'Adult.list routes to NSFW'],
      [`http://canva.cn:${directSink.port}/`, `canva.cn:${directSink.port}`, 'DIRECT', 'Canva China routes DIRECT'],
      ['http://canva.com/', 'canva.com', 'SG', 'Canva international routes to AI'],
      ['http://x-aiplatform.googleapis.com.attacker.invalid/', 'x-aiplatform.googleapis.com.attacker.invalid', 'HK', 'Unmatched host falls back to default']
    ];
    for (const [url, host, expectedTag, desc] of routeCases) {
      const actualTag = await sendProxyRequest(routeProxyPort, url, host);
      assert(actualTag === expectedTag, `Mihomo routing mismatch for ${desc} (${host}): expected ${expectedTag}, got ${actualTag}`);
    }
    console.log('PASS: Mihomo runtime matches DOMAIN-WILDCARD, AI, Google, Direct, Custom.list, Adult.list and OpenAI_Voice.list rules accurately');
  } catch (error) {
    console.error(logs);
    throw error;
  } finally {
    for (const proc of [child, routeChild]) {
      if (proc && proc.exitCode === null) { const stopped = once(proc, 'exit'); proc.kill('SIGTERM'); await stopped; }
    }
    for (const server of sinks) {
      await new Promise(resolve => server.close(resolve));
    }
    dns.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
