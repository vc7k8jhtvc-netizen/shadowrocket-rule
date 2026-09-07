# 维护约定

安装、默认出口和日常排查见 [README](README.md)。

## 修改范围

| 修改内容 | 维护要求 |
|---|---|
| 个人未分类国际服务域名 | 只修改 Global.list，两端远程共用；不重复收录已有专项规则覆盖的服务 |
| 专项规则、策略组、节点筛选或规则顺序 | 同步修改并检查 Shadowrocket 与 Clash |
| Shadowrocket Rewrite / MITM / 脚本 | 主配置固定保留 Google CN Rewrite/MITM；其他功能继续模块化，只维护对应模块及其测试、使用说明，不复制到 Clash |
| 兼容性修复或默认出口调整 | 可保留现有稳定路径，记录 CHANGELOG |
| 新增主分流功能、架构或规则优先级变化 | 升级版本；DNS 架构、策略组结构、节点机制等不兼容变化也须升级 |

不重新镜像第三方完整规则库，不引入未经验证的大型 Global 规则。保留有用的变更结果，临时排查过程由 Git 历史追溯。

## 必须保留的行为

- 分流顺序：LAN → 专项服务 → Global → China / China_Domain → GEOIP → FINAL；AI 在 Google 之前，字节跳动大陆直连规则在 TikTok 之前。
- Apple 与中国服务均保留主规则和域名集两部分，避免漏掉仅收录于域名集的服务。
- 两端节点筛选使用相同、区分大小写的 WestData 命名规则；Clash 空节点处理见 README。
- Shadowrocket 保留 WestData 兼容的 DNS、系统绕过和三条入口 Host 映射，启用 `use-local-host-item-for-proxy = true`；不重新强制 DoH、DNS 劫持或直连失败转代理。
- Shadowrocket 主配置固定保留 `google.cn` / `g.cn` → `google.com` 的 Rewrite，以及 `*.google.cn` 的最小 MITM 范围；设备本地 CA、`ca-passphrase`、`ca-p12`、私钥不得入库。
- Clash 保留订阅 DNS、hosts、IPv6 和节点入口参数；LAN 使用 `no-resolve`，不为前置局域网判断主动解析域名。
- 按已确认的取舍，Clash 继续整体重建策略组并继承节点/DNS 参数；暂不处理保留参数对原策略组的引用依赖。
- YouTube Worker 的精确分流保留在模块内，使用“▶️ YouTube”出口，不扩展到整个 workers.dev。

## 检查与发布

发布前运行现有统一检查：

```bash
bash scripts/check-config.sh
```

它覆盖当前树敏感信息、Shadowrocket 结构及 Google CN Rewrite/MITM、Clash 行为、双端关键规则一致性和 YouTube 模块结构。GitHub Actions 另用固定版本 Mihomo 检查配置解析、provider 空组阻断及 LAN 不提前查询 DNS。

修改节点命名或 Host 假设时，用私人配置在本地验证：

```bash
node scripts/check-westdata-local.js /path/to/private-westdata.conf
```

检查器只输出计数与 PASS/FAIL，不输出节点凭据。私人输入不得提交，详见 [安全说明](SECURITY.md)。

普通维护可直接更新 `main`，较大改动按需使用分支/PR；不强制 Ruleset 或分支保护。发布后核对 CI。变更涉及远程规则时检查下载与实际命中；涉及 DNS 时检查节点连接、规则下载、国内直连和境外代理。自动测试不能替代设备上的模块播放验证。
