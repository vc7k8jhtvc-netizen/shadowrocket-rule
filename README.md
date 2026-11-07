# Shadowrocket / Clash Verge Rev 分流配置

适用于 WestData 的个人分流配置。Shadowrocket 与 Clash 保持相同的业务分组及“中国大陆直连、其余未知流量默认代理”语义。**内部版本为 `v2.7.24`。本版本将个人 AI 中转 `a6api.vip` / `a6api.com` 正式纳入“🤖 AI”，补齐双端断言与文档；修复负例回归在 CRLF 检出下失效的问题，新增 `.gitattributes` 固定 LF；CI 校验基线升级至 Mihomo `v1.19.33`。OpenAI 显式规则仍只覆盖自有或实例专属主机，v2.7.23 的收窄结论不变。**

## Shadowrocket

1. 保留原始 `WestData.conf`；仅在订阅上游实际内容发生变化时更新，确认内容无变化时无需因文件时间戳较旧而刷新。
2. [下载 Shadowrocket_Routing.conf](https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Shadowrocket_Routing.conf) 并设为当前配置。
3. 确认 `[General]` 中的 `include = WestData.conf` 有效；若本地文件名不同，在配置详情的“通用 → 包含配置”中手动选择原订阅。
4. 核对“🚀 默认代理”、业务组、“🧩 自定义”、地区节点池及“🐟 漏网之鱼”。

| 来源 | 职责 |
|---|---|
| WestData.conf | 节点、General / DNS / TUN、Host、URL Rewrite、MITM 与供应商基础能力；不要将私人订阅提交仓库 |
| Shadowrocket_Routing.conf | Proxy Group、Rule；**无 Advertising 规则或广告策略组** |
| Custom.list | 两端共用的个人显式分流规则 |
| YouTube.Enhance.Shadowrocket.sgmodule | 仅 YouTube 专属增强脚本/规则及专属 MITM 主机；脚本直接跟随 Maasea `master`，不再固定 commit SHA |
| Clash_Verge_Rev_Script.js | Clash Verge Rev 扩展脚本，重建策略组和分流，继承订阅 DNS/hosts |

当前 Routing 优先于被包含的配置。保留末尾三条显式终结规则，让剩余域名和纯 IP 流量优先归入“🐟 漏网之鱼”，避免进入 WestData 的旧 `[Rule]`；该机制在 2026-09-09 曾通过 Shadowrocket 实机日志验证。**v2.7.19 新增的 Claude / Anthropic 分流已于 2026-10-06 完成设备端连接验证，结果正常。**

Shadowrocket 客户端：上游最新版为 `2.2.93`（2026-10-29）。该版本改动集中在 macOS 菜单栏模式、tunnel 路由选项优先级、iCloud 同步，以及全局通配 MITM 与 HTTP host 匹配的崩溃修复；未变更规则、策略组或模块格式语义，本项目依赖的 `DOMAIN-WILDCARD`、`policy-regex-filter` 与 `include` 能力不受影响。升级后建议确认 YouTube 模块仍能正常加载——其 MITM 主机 `*.googlevideo.com` / `youtubei.googleapis.com` 属于通配匹配路径，正是本次修复覆盖的场景。

## 广告拦截策略（自 v2.7.18 起）

由于通用 Advertising 规则存在误杀风险，正式分流已同时取消 Shadowrocket 的 `Advertising.list` / `Advertising_Domain.list` 以及 Clash 的 Advertising Providers、引用和“🛑 广告拦截”策略组。命中普通广告域名不再由本项目直接拒绝，而是继续进入后续业务、中国直连或兜底规则。不要简单将旧广告策略组改为 DIRECT：那会绕过正常分流。

**以前已经导入客户端的旧版配置与缓存不会被仓库自动删除。** 更新当前分流配置并清理旧广告模块；若客户端仍启用独立的第三方去广告模块或其他 DNS 广告屏蔽，需要在客户端另行停用。保留 YouTube 专项增强不等于保留通用广告黑名单；X 时间线推广内容没有独立过滤脚本。

## 业务分组与默认出口

| 策略组 / 服务 | 默认出口 |
|---|---|
| 🚀 默认代理 | 🇭🇰 香港 |
| 🤖 AI（ChatGPT / Gemini / Grok / Claude） | 🇸🇬 新加坡 |
| 🍎 Apple、🪟 Microsoft、DeepSeek | DIRECT |
| 🔎 Google、💻 GitHub、📱 社交媒体、▶️ YouTube、✈️ Telegram、🧩 自定义 | 🚀 默认代理 |
| 🐟 漏网之鱼 | 🚀 默认代理；可切换 DIRECT / 👆 手动选择等 |

ChatGPT 手工规则只强制 OpenAI 自有域名和实例专属主机进入“🤖 AI”。OpenAI 官方网络文档列出的 WorkOS、Intercom、Stripe、Cloudflare、Apple、Datadog 等共享依赖仍可能被 ChatGPT 使用，但本项目不再将这些共享主机全局绑定到 AI 出口；它们继续按后续业务/中国/兜底规则处理，避免影响其他应用。`a6api.vip` / `a6api.com` 是本人使用的第三方 AI 中转，不属于 OpenAI 官方域名，作为显式声明的个人例外固定进入“🤖 AI”，并由 `check-routing-hardening.js` 锁定；除这两条外不得扩大 AI 手工规则。

Claude 新增四条专属后缀分流：`claude.ai`（Web / 登录 / 下载）、`claude.com`（平台与文档）、`anthropic.com`（API 与自有服务，包含 `api.anthropic.com`）、`claudeusercontent.com`（Artifacts / 内容预览），均指向“🤖 AI”。规则置于其他服务规则与中国直连规则之前，不新增第三方共用 CDN / 统计域名、不引入新 Provider / MITM / DNS；未命中的依赖继续沿用原有分流。参考：[Anthropic 官方网络要求](https://code.claude.com/docs/en/network-config)、[官方 Claude 网络控制文档](https://support.claude.com/en/articles/13198485-enforce-network-level-access-control-with-tenant-restrictions)。

地区节点池：香港、台湾、新加坡、日本、美国。Shadowrocket 用 `policy-regex-filter` 按“地区 | 节点”筛选；若某地区组为空，请手动选择节点并核对名称，客户端的空组呈现以设备行为为准。

### 显式终结与 Custom.list

`Custom.list` 恢复自原 Global.list，仍放在 Google 之后、中国规则之前；“🧩 自定义”默认使用“🚀 默认代理”。末尾固定：

```ini
DOMAIN-WILDCARD,*,🐟 漏网之鱼
IP-CIDR,0.0.0.0/0,🐟 漏网之鱼,no-resolve
IP-CIDR,::/0,🐟 漏网之鱼,no-resolve
```

不再使用特殊 `FINAL`；Clash 的对应终结规则为 `MATCH,🐟 漏网之鱼`。DeepSeek `deepseek.com` 固定直连，Grok/xAI 与新增 Claude/Anthropic 专属域名归入 AI，字节跳动 `bytedance.com` / `bytedance.net` 固定直连。

[查看 Custom.list](https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Custom.list)

`Custom.list` 为个人用途的完整显式分流清单，其中包含成人站点域名，仅代表个人使用偏好，不构成推荐或背书；仓库公开可读，如对外分享请自行评估可见性。

## Clash Verge Rev

[下载 Clash_Verge_Rev_Script.js](https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Clash_Verge_Rev_Script.js)

Clash Verge Rev 的运行模式由应用设置控制；请在客户端设置中选择“规则”。扩展脚本不强制改写 `mode`。

Clash 扩展脚本与小火箭同步业务组、Claude 规则、Custom 及中国直连语义。中国域名 provider 使用上游 Clash 专用 `China_Domain.txt`，`GEOIP,CN,DIRECT` 不带 `no-resolve`；保留原订阅 DNS、hosts、IPv6 及节点参数。旧 Advertising 规则与缓存需要由客户端按实际配置清理。

订阅节点的 `dialer-proxy`、Provider 下载策略及 DNS 的 `rule-set:` 引用所需依赖会单独保留；依赖组显示为 `__subscription_group_*`，依赖规则集使用 `__subscription_rule_*` 名称，避免与业务配置重名。DNS 中对应引用会同步更新；原订阅中未被使用的策略组与规则集仍被移除。v2.7.23 起，重复节点名、节点名与项目策略组冲突、缺失策略引用及缺失 proxy-provider 会在写回配置前直接拒绝，避免生成半有效配置。

**客户端版本基线：Clash Verge Rev `v2.5.8` 正式版已完成客户端版本验证；该实机结论对应 v2.7.22 及此前配置。上游最新为 `v2.5.10`（2026-11-03），其中 `v2.5.9` 起内置 Mihomo 内核升至 `v1.19.33`，与项目 CI 基线一致。v2.7.23 / v2.7.24 的路由与校验改动已通过静态回归和 Mihomo 加载验证，但尚未完成新的设备端回归，不得标记为实机验证通过。**

升级到 `v2.5.9` 及以上后需核对三点：

1. 设置中的「DNS 覆写」开关状态必须与实际一致。扩展脚本通过 `preserveDns()` 有意保留订阅原始 DNS；应用层覆写会绕过该保留，导致 WestData 的 DNS 配置失效。`v2.5.10` 修复了该开关“实际已关闭但显示开启”的状态显示问题，升级后以实际生效状态为准。
2. `v2.5.10` 修复了服务模式下内核更新的 GEO 数据库不回写应用目录的问题。本项目使用不带 `no-resolve` 的 `GEOIP,CN,DIRECT`，GEO 库陈旧会直接影响中国直连判定，升级后应确认国内站点仍为 DIRECT。
3. Windows 覆盖安装前请先完全退出客户端；`v2.5.10` 修复了安装程序未提示退出运行中应用导致覆盖失败或卸载报错的问题，但已有进程仍可能干扰升级。

## 可选：仅 YouTube 增强（Shadowrocket）

[下载 YouTube.Enhance.Shadowrocket.sgmodule](https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/YouTube.Enhance.Shadowrocket.sgmodule)

提供 YouTube / YouTube Music 去广告、画中画与后台播放脚本。继续保留两个 YouTube UDP 拒绝规则，用于回退 TCP/TLS；它们不是全局广告黑名单。MITM 只追加 `*.googlevideo.com` 和 `youtubei.googleapis.com`。模块不携带证书或 CA 私钥，依赖设备已正确配置的 Shadowrocket MITM 证书。更新后请确认客户端没有并存旧版合并模块。

**自 v2.7.22 起，`youtube.response.js` / `youtube.request.js` 的 `script-path` 直接引用 `Maasea/sgmodule` 的 `master` 分支，不再锁定 commit SHA。上游提交新脚本后会自动生效，无需手动更新本仓库。** 2026-10-06 的设备端验证适用于当时上游版本；后续上游脚本改变运行行为时，应以实际设备表现为准。

## 连接日志核验

| 样本 | 预期 |
|---|---|
| deepseek.com、bytedance.com | DIRECT |
| chatgpt.com、gemini.google.com、grok.com | 🤖 AI |
| claude.ai、claude.com、api.anthropic.com、*.claudeusercontent.com | 🤖 AI |
| wikipedia.org、jable.tv、missav.ws | 🧩 自定义 |
| youtube.com | ▶️ YouTube |
| github.com | 💻 GitHub |
| bilibili.com | DIRECT（依赖上游中国规则） |
| steampowered.com、其他未匹配域名 | 🐟 漏网之鱼 |

2026-10-06 已完成 Claude 网页 / 应用 / API / Artifacts 分流与当时的 YouTube 专项增强设备核验；Clash Verge Rev `v2.5.8` 客户端版本已验证。**v2.7.24 仍需按上述样本补一次设备端回归后，才能将当前配置标记为实机验证完成；重点复核 `a6api.vip` / `a6api.com` 是否按预期进入“🤖 AI”。** 由于 Clash Verge Rev `v2.5.9` 起内置内核已升至 `v1.19.33`，建议直接在 `v2.5.10` 上完成这次回归：一次复测即可同时关闭 v2.7.23 / v2.7.24 的验证欠账，并让实机内核版本与 CI 基线一致（此前 `v2.5.8` 的内核版本低于 CI 基线）。YouTube 上游脚本现已自动跟随 `master`，后续上游发生行为变化时再重新验证。

## 维护

- [维护约定](EXPERIENCE.md)
- [变更记录](CHANGELOG.md)
- [安全说明](SECURITY.md)

本地发布前运行 `bash scripts/check-config.sh`；私人订阅可使用 `WESTDATA_CONFIG=/path/to/WestData.conf bash scripts/check-config.sh` 单独校验，但不得提交到仓库。GitHub Actions 另每日检查 Maasea YouTube 脚本及 Blackmatrix 关键规则源的可达性和基础结构。
