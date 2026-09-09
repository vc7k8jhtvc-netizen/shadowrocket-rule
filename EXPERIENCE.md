# 维护约定

安装、默认出口和日常排查见 [README](README.md)。

## 架构

Shadowrocket 以 `Shadowrocket_Routing.conf` 为唯一主路径：

- `WestData.conf`：节点、General / DNS / TUN、Host、URL Rewrite、MITM 与供应商基础设置。
- `Shadowrocket_Routing.conf`：仅 Proxy Group 与 Rule（含 Shadowrocket 广告拦截）；通过 `include = WestData.conf` 继承底座。
- YouTube Enhance：Shadowrocket 专属功能模块。
- Clash Verge Rev：保留订阅基础参数，扩展脚本重建策略组与规则。

## 修改范围

| 修改内容 | 维护要求 |
|---|---|
| 未分类国际服务域名 | 不再单独维护域名清单；中国规则与 GEOIP 未命中后，由 FINAL 默认进入 🌍 Global |
| 专项规则、策略组、节点筛选或规则顺序 | 同步修改并检查 Shadowrocket Routing 与 Clash |
| 广告拦截规则 | Shadowrocket 使用 `Advertising.list` 与 `Advertising_Domain.list`；Clash 使用 `Advertising.yaml` 与 `Advertising_Domain.txt`；两端保持默认 REJECT 与规则优先级一致 |
| Shadowrocket 基础网络参数 | Routing 不复制；由被包含的 WestData.conf 负责 |
| Shadowrocket Rewrite / MITM / Host | Routing 不维护；供应商基础功能由 WestData.conf 提供，额外增强继续模块化 |
| 兼容性修复或默认出口调整 | 记录 CHANGELOG，并保持 Routing 职责边界不变 |
| 新增主分流功能、策略组结构或规则优先级变化 | 升级 Routing 版本并同步双端检查 |

不重新镜像第三方完整规则库，不为普通国际站点维护大型手工域名补丁表。

## 必须保留的行为

- Routing 的 `[General]` 只能保留 `include = WestData.conf`，不得重新复制 DNS、TUN、Host、Rewrite、MITM 等基础设置。
- 分流顺序：LAN → AI 专项例外 → Advertising → 其他专项服务 → China / China_Domain → GEOIP → FINAL；FINAL 默认进入 🌍 Global。AI 在 Google 之前，字节跳动大陆直连规则在 TikTok 之前。
- Apple 与中国服务均保留主规则和域名集两部分。
- 两端节点筛选使用相同、区分大小写的 WestData 命名规则。
- Shadowrocket Routing 与 Clash 的业务策略组、广告拦截主体和规则优先级应保持语义一致；Shadowrocket 的 URL-REGEX 细节由其客户端规则支持。
- Clash 保留订阅 DNS、hosts、IPv6 和节点入口参数；LAN 使用 `no-resolve`。
- Clash 继续整体重建策略组并继承节点/DNS 参数；暂不处理保留参数对原策略组的引用依赖。
- YouTube Worker 精确分流保留在模块内，使用“▶️ YouTube”出口，不扩展到整个 workers.dev。

## 检查与发布

发布前运行：

```bash
bash scripts/check-config.sh
```

检查覆盖：

- Routing 仅包含 include / Proxy Group / Rule；
- Advertising 主规则、域名集及其默认 REJECT 选择；
- Shadowrocket / Clash 关键行为一致性；
- 当前树敏感信息与 YouTube 模块结构；
- Routing 配置、README 与当前 CHANGELOG 的版本一致性。

修改节点命名或验证 WestData 底座时，用私人配置本地检查：

```bash
node scripts/check-westdata-local.js /path/to/private-westdata.conf
```

私人 WestData 配置不得提交。WestData 大改后，必须在设备上核对包含关系、地区节点、AI / 广告 / YouTube / GitHub、中国直连、FINAL，以及 Google Rewrite/MITM。

普通维护可直接更新 `main`；较大改动按需使用分支/PR。
