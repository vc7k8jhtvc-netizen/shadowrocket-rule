// Isolated synthetic configurations; never reads a private subscription or dials real nodes.
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const net = require('net');
const dgram = require('dgram');
const { spawn } = require('child_process');
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

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mihomo-audit-'));
  const dns = dgram.createSocket('udp4');
  let queries = 0;
  dns.on('message', () => { queries++; });
  dns.bind(0, '127.0.0.1');
  await once(dns, 'listening');
  let child;
  let logs = '';
  try {
    const apiPort = await freePort();
    const proxyPort = await freePort();
    const output = ctx.main({ 'proxy-providers': { Test: { type: 'inline', payload: [
      { name: 'unmatched-test-node', type: 'ss', server: '127.0.0.1', port: 1, cipher: 'aes-128-gcm', password: 'test-only' }
    ] } } });
    // Keep the generated LAN rule and group configuration; eliminate remote downloads.
    output['rule-providers'] = { Lan: { type: 'inline', behavior: 'classical', payload: ['IP-CIDR,10.0.0.0/8'] } };
    output.rules = [output.rules[0], 'MATCH,REJECT'];
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
    for (const name of ['🌐 手动选择', '🇭🇰 香港', '🏝️ 台湾', '🇸🇬 新加坡', '🇯🇵 日本', '🇺🇸 美国']) {
      assert(groups[name].now === 'REJECT' && JSON.stringify(groups[name].all) === '["REJECT"]', 'empty filtered group is not blocked: ' + name);
    }
    // Domain-only HTTP proxy traffic must reach REJECT without querying the local DNS trap.
    await new Promise((resolve, reject) => {
      const socket = net.connect(proxyPort, '127.0.0.1', () => socket.write('GET http://audit.example.invalid/ HTTP/1.1\r\nHost: audit.example.invalid\r\nConnection: close\r\n\r\n'));
      socket.setTimeout(2000, () => { socket.destroy(); reject(new Error('domain request stalled before REJECT')); });
      socket.on('data', () => {});
      socket.on('error', reject);
      socket.on('close', resolve);
    });
    assert(queries === 0, 'LAN unexpectedly triggered DNS before domain routing');
    console.log('PASS: Mihomo rejects empty provider groups and LAN performs no early DNS lookup');
  } catch (error) {
    console.error(logs);
    throw error;
  } finally {
    if (child && child.exitCode === null) { const stopped = once(child, 'exit'); child.kill('SIGTERM'); await stopped; }
    dns.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
