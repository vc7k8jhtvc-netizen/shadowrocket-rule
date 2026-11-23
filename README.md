# Shadowrocket / Clash Verge Rev 分流配置

适用于 WestData 的个人分流配置。Shadowrocket 与 Clash 保持相同的业务分组及“中国大陆直连、其余未知流量默认代理”语义。**内部版本为 `v2.7.34`。本版本将双端手工 AI 分流规则收口至单一数据源 `rules/ai-rules.json`，通过 `scripts/sync-ai-rules.js` 自动同步生成 `Shadowrocket_Routing.conf` 与 `Clash_Verge_Rev_Script.js` 的对应区块，并在本地与 CI 门禁中强制校验同步一致性；双端运行规则与分流行为与 `v2.7.33` 完全一致。**

## Shadowrocket

1. 保留原始 `WestData.conf`；仅在订阅上游实际内容发生变化时更新，确认内容无变化时无需因文件时间戳较旧而刷新。
2. [下载 Shadowrocket_Routing.conf](https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Shadowrocket_Routing.conf) 并设为当前配置。
3. 确认 `[General]` 中的 `include = WestData.conf` 有效；若本地文件名不同，在配置详情的“通用 → 包含配置”中手动选择原订阅。
4. 核对“🚀 默认代理”、业务组、“🧩 自定义”、地区节点池及“🐟 漏网之鱼”。

| 来源 | 职责 |
|---|---|
| WestData.conf | 节点、General / DNS / TUN、Host、URL Rewrite、MITM 与供应商基础能力；不要将私人订阅提交仓库 |
| Shadowrocket_Routing.conf | Proxy Group、Rule；**无 Advertising 规则或广告策略组**（AI 规则区块由 `rules/ai-rules.json` 同步生成） |
| rules/ai-rules.json | 双端手工 AI 分流规则单一数据源；修改后运行 `node scripts/sync-ai-rules.js` 同步 |
| Custom.list | 两端共用的个人显式分流规则；Exa、Tavily、Supabase、Hugging Face 已移至 AI，不在此清单 |
| YouTube.Enhance.Shadowrocket.sgmodule | 仅 YouTube 专属增强脚本/规则及专属 MITM 主机；脚本直接跟随 Maasea `master`，不再固定 commit SHA |
| Clash_Verge_Rev_Script.js | Clash Verge Rev 扩展脚本，重建策略组和分流，继承订阅 DNS/hosts（AI 规则区块由 `rules/ai-rules.json` 同步生成） |

当前 Routing 优先于被包含的配置。保留末尾三条显式终结规则，让剩余域名和纯 IP 流量优先归入“🐟 漏网之鱼”，避免进入 WestData 的旧 `[Rule]`；该机制在 2026-09-09 曾通过 Shadowrocket 实机日志验证。**v2.7.19 新增的 Claude / Anthropic 分流已于 2026-10-06 完成设备端连接验证，结果正常。**

Shadowrocket 客户端：上游最新版为 `2.2.93`（2026-10-29）。该版本改动集中在 macOS 菜单栏模式、tunnel 路由选项优先级、iCloud 同步，以及全局通配 MITM 与 HTTP host 匹配的崩溃修复；未变更规则、策略组或模块格式语义，本项目依赖的 `DOMAIN-WILDCARD`、`policy-regex-filter` 与 `include` 能力不受影响。升级后建议确认 YouTube 模块仍能正常加载——其 MITM 主机 `*.googlevideo.com` / `youtubei.googleapis.com` 属于通配匹配路径，正是本次修复覆盖的场景。

## 广告拦截策略（自 v2.7.18 起）

由于通用 Advertising 规则存在误杀风险，正式分流已同时取消 Shadowrocket 的 `Advertising.list` / `Advertising_Domain.list` 以及 Clash 的 Advertising Providers、引用和“🛑 广告拦截”策略组。命中普通广告域名不再由本项目直接拒绝，而是继续进入后续业务、中国直连或兜底规则。不要简单将旧广告策略组改为 DIRECT：那会绕过正常分流。

**以前已经导入客户端的旧版配置与缓存不会被仓库自动删除。** 更新当前分流配置并清理旧广告模块；若客户端仍启用独立的第三方去广告模块或其他 DNS 广告屏蔽，需要在客户端另行停用。保留 YouTube 专项增强不等于保留通用广告黑名单；X 时间线推广内容没有独立过滤脚本。

## 业务分组与默认出口

| 策略组 / 服务 | 默认出口 |
|---|---|
| 🚀 默认代理 | 🇭🇰 香港 |
| 🤖 AI（ChatGPT / Gemini / Grok / Claude / Canva / Exa / Tavily / Supabase / Hugging Face） | 🇸🇬 新加坡 |
| 🍎 Apple、🪟 Microsoft、DeepSeek、Canva 可画（中国大陆） | DIRECT |
| 🔎 Google、💻 GitHub、📱 社交媒体、▶️ YouTube、✈️ Telegram、🧩 自定义 | 🚀 默认代理 |
| 🐟 漏网之鱼 | 🚀 默认代理；可切换 DIRECT / 👆 手动选择等 |

ChatGPT 手工规则只强制 OpenAI 自有域名和实例专属主机进入“🤖 AI”。OpenAI 官方网络文档列出的 WorkOS、Intercom、Stripe、Cloudflare、Apple、Datadog 等共享依赖仍可能被 ChatGPT 使用，但本项目不再将这些共享主机全局绑定到 AI 出口；它们继续按后续业务/中国/兜底规则处理，避免影响其他应用。`a6api.vip` / `a6api.com` 是本人使用的第三方 AI 中转，不属于 OpenAI 官方域名，作为显式声明的个人例外固定进入“🤖 AI”，并由 `check-routing-hardening.js` 锁定；个人中转范围除这两条外不得扩大，其他服务按各自专项规则处理。

Gemini / Google AI 现按 Google AI 专属入口统一指向“🤖 AI”，覆盖 Gemini Web 与内部后端、Google AI Studio、Gemini Notebook（原 NotebookLM）、Gemini in Workspace、Generative Language API、Vertex AI、Gemini Code Assist、DeepMind、Jules、Google Antigravity、Google Labs / Flow / Opal / Stitch、AI Test Kitchen、Gemma、Android Studio Gemini Code Assist 与 Gemini Enterprise。Antigravity 包含 `antigravity.google` / `antigravity.google.com`、`antigravity.googleapis.com`、`antigravity-pa.googleapis.com` 与 `antigravity-unleash.goog`；Vertex 区域主机 `*-aiplatform.googleapis.com` 由 `DOMAIN-WILDCARD` 规则精确锚定覆盖。`accounts.google.com`、`www.googleapis.com`、`apis.google.com`、`firebaseinstallations.googleapis.com`、`play.google.com`、`googleusercontent.com`、`gstatic.com`、YouTube、广告与分析等共享主机不因 AI 服务被全局接管，继续按原业务规则处理。参考：[Google Gemini geosite 规则](https://github.com/MetaCubeX/meta-rules-dat/tree/meta/geo/geosite/classical)、[v2fly Google DeepMind 规则](https://github.com/v2fly/domain-list-community/blob/master/data/google-deepmind)、[Antigravity Enterprise 网络要求](https://antigravity.google/docs/enterprise)、[Gemini 应用防火墙主机](https://knowledge.workspace.google.com/admin/generative-ai/gemini-app/gemini-app-firewall-settings)。

Claude 新增四条专属后缀分流：`claude.ai`（Web / 登录 / 下载）、`claude.com`（平台与文档）、`anthropic.com`（API 与自有服务，包含 `api.anthropic.com`）、`claudeusercontent.com`（Artifacts / 内容预览），均指向“🤖 AI”。规则置于其他服务规则与中国直连规则之前，不新增第三方共用 CDN / 统计域名、不引入新 Provider / MITM / DNS；未命中的依赖继续沿用原有分流。参考：[Anthropic 官方网络要求](https://code.claude.com/docs/en/network-config)、[官方 Claude 网络控制文档](https://support.claude.com/en/articles/13198485-enforce-network-level-access-control-with-tenant-restrictions)。

Canva 国际版及自有开发/应用/状态域名（`canva.com`、`canva.ai`、`canva.app`、`canva.dev`、`canva.me`、`canva.site`、`canva.link`、`canva.run`、`canva-apps.com`、`canva-hosted-embed.com`、`canvacode.com`、`canvastatus.com`）通过 `DOMAIN-SUFFIX` 指向“🤖 AI”，不引入 Cloudflare 等共享 CDN；Canva 可画中国大陆域名（`canva.cn`、`canva-apps.cn`、`canva-code.cn`、`my.canvasite.cn`）保持 `DIRECT` 直连。用户自行绑定到 Canva 的自定义域名不属于 Canva 自有后缀，无法仅按域名自动识别。

Exa 与 Tavily 的网站、API、控制台、文档及 MCP 入口统一使用 `exa.ai`、`tavily.com` 两个自有后缀，并已从 `Custom.list` 移除后显式指向“🤖 AI”。Supabase 的 `supabase.com`、`supabase.co`、`supabase.in`，以及 Hugging Face 的 `huggingface.co`、`hf.co`、`hf.space`，也按当前个人偏好从 `Custom.list` 移入“🤖 AI”。规则不引入第三方共享域名，也不新增 Provider、MITM 或 DNS。

地区节点池：香港、台湾、新加坡、日本、美国。Shadowrocket 用 `policy-regex-filter` 按“地区 | 节点”筛选；所有业务组都可直接选择这五个地区及“👆 手动选择”，从而访问订阅中的其他地区。若某地区组为空，请手动选择节点并核对名称，客户端的空组呈现以设备行为为准。

### 显式终结与 Custom.list

`Custom.list` 恢复自原 Global.list，仍放在 Google 之后、中国规则之前；“🧩 自定义”默认使用“🚀 默认代理”。末尾固定：

```ini
DOMAIN-WILDCARD,*,🐟 漏网之鱼
IP-CIDR,0.0.0.0/0,🐟 漏网之鱼,no-resolve
IP-CIDR,::/0,🐟 漏网之鱼,no-resolve
```

不再使用特殊 `FINAL`；Clash 的对应终结规则为 `MATCH,🐟 漏网之鱼`。DeepSeek `deepseek.com` 固定直连，Grok/xAI 与新增 Claude/Anthropic 专属域名归入 AI，字节跳动 `bytedance.com` / `bytedance.net` 固定直连。

[查看 Custom.list](https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Custom.list)

`Custom.list` 为个人用途的完整显式分流清单，其中包含成人站点域名，仅代表个人使用偏好，不构成推荐或背书；仓库公开可读，如对外分享请自行评估可见性。Exa、Tavily、Supabase、Hugging Face 已提升为双端 AI 手工规则，不应重新加入该清单；JapaneseASMR 与 ASMR.one 已在清单内部归入成人网站分类。

## Clash Verge Rev

[下载 Clash_Verge_Rev_Script.js](https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Clash_Verge_Rev_Script.js)

Clash Verge Rev 的运行模式由应用设置控制；请在客户端设置中选择“规则”。扩展脚本不强制改写 `mode`。

Clash 扩展脚本与小火箭同步业务组、Claude / Gemini 规则、Custom 及中国直连语义。Apple 与中国域名 Provider 统一使用上游 Clash 专用 `Apple_Domain.yaml` / `China_Domain.yaml`（`+.` 语法，确保根域名与子域名同时命中），`GEOIP,CN,DIRECT` 之前的古典规则集均附加 `no-resolve` 避免提前 DNS 解析，`GEOIP,CN,DIRECT` 本身不带 `no-resolve`；空地区池无论来自静态 `proxies` 还是 `proxy-providers` 均以 `REJECT` 失败关闭，避免跨区静默回退；保留原订阅 DNS、hosts、IPv6 及节点参数。旧 Advertising 规则与缓存需要由客户端按实际配置清理。

订阅节点的 `dialer-proxy`、Provider 下载策略、`listeners` / `tunnels` 出口策略、DNS 服务器 `#策略组` 标签以及 DNS `rule-set:` 引用（含混合 `nameserver-policy` 键）所需依赖会单独保留；Mihomo 保留的 DNS `#RULES` 标签原样透传；依赖组显示为 `__subscription_group_*`，依赖规则集使用 `__subscription_rule_*` 名称并自动隔离冲突的缓存 `path`，避免与业务配置重名。DNS 中对应引用会同步更新；原订阅中未被使用的策略组、规则集及孤立 `sub-rules` 会被移除（若 `listeners` 引用了 `sub-rules` 则直接拒绝）。无效节点/策略组对象（含非数组 `proxies`）、重复节点名、节点名与项目策略组冲突、缺失策略引用及缺失 proxy-provider 会在写回配置前直接拒绝，避免生成半有效配置。

**客户端版本基线：Clash Verge Rev `v2.5.10` 正式版已完成客户端版本验证（2026-11-08），内置 Mihomo 内核 `v1.19.33` 与项目 CI 基线一致；该结论同时覆盖 v2.7.23 / v2.7.24 的路由与校验改动。`v2.5.8` 保留为 v2.7.22 及此前配置的历史验证基线。**

本次升级已核对三项（Windows，系统代理模式）：

1. 内置内核为 `v1.19.33`，与 CI 基线一致。此前 `v2.5.8` 的内核版本低于该基线，实机结论与 CI 结论首次出于同一核心版本。
2. 应用层「DNS 覆写」（`enable_dns_settings`）处于关闭状态，扩展脚本 `preserveDns()` 保留的订阅 DNS 实际生效。
3. 运行模式为“规则”（`mode: rule`）；`v2.5.10` 修复了服务模式下 GEO 数据库不回写应用目录的问题，`GEOIP,CN,DIRECT` 所需数据正常加载。

Windows 覆盖安装前仍需先完全退出客户端。

## 可选：仅 YouTube 增强（Shadowrocket）

[下载 YouTube.Enhance.Shadowrocket.sgmodule](https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/YouTube.Enhance.Shadowrocket.sgmodule)

提供 YouTube / YouTube Music 去广告、画中画与后台播放脚本。继续保留两个 YouTube UDP 拒绝规则，用于回退 TCP/TLS；它们不是全局广告黑名单。MITM 只追加 `*.googlevideo.com` 和 `youtubei.googleapis.com`。模块不携带证书或 CA 私钥，依赖设备已正确配置的 Shadowrocket MITM 证书。更新后请确认客户端没有并存旧版合并模块。

**自 v2.7.22 起，`youtube.response.js` / `youtube.request.js` 的 `script-path` 直接引用 `Maasea/sgmodule` 的 `master` 分支，不再锁定 commit SHA。上游提交新脚本后会自动生效，无需手动更新本仓库。** 2026-10-06 的设备端验证适用于当时上游版本；后续上游脚本改变运行行为时，应以实际设备表现为准。

## 连接日志核验

| 样本 | 预期 |
|---|---|
| deepseek.com、bytedance.com、canva.cn | DIRECT |
| chatgpt.com、gemini.google.com、aistudio.google.com、notebooklm.google.com、antigravity.google、labs.google、opal.google、generativelanguage.googleapis.com、grok.com | 🤖 AI |
| claude.ai、claude.com、api.anthropic.com、*.claudeusercontent.com | 🤖 AI |
| canva.com、canva.ai、canva.app、canva.dev、*.canva.site | 🤖 AI |
| exa.ai、api.exa.ai、tavily.com、api.tavily.com | 🤖 AI |
| supabase.com、supabase.co、supabase.in、huggingface.co、hf.co、hf.space | 🤖 AI |
| wikipedia.org、jable.tv、missav.ws | 🧩 自定义 |
| youtube.com | ▶️ YouTube |
| github.com | 💻 GitHub |
| bilibili.com | DIRECT（依赖上游中国规则） |
| steampowered.com、其他未匹配域名 | 🐟 漏网之鱼 |

2026-10-06 已完成 Claude 网页 / 应用 / API / Artifacts 分流与当时的 YouTube 专项增强设备核验。**v2.7.24 已于 2026-11-08 在 Clash Verge Rev `v2.5.10`（内置 Mihomo `v1.19.33`）上按上述样本完成设备端回归，结果正常；`a6api.vip` / `a6api.com` 按预期进入“🤖 AI”。** 该次回归同时关闭了 v2.7.23 遗留的验证欠账。YouTube 上游脚本现已自动跟随 `master`，后续上游发生行为变化时再重新验证。

Canva 规则为 v2.7.25 新增，当前仅完成静态规则、双端一致性及本地校验回归；尚未以客户端连接日志完成设备端核验。Exa、Tavily 规则为 v2.7.26 新增，同样仅完成静态规则、双端一致性及本地校验回归。Supabase、Hugging Face 规则为 v2.7.27 新增，当前同样仅完成静态规则、双端一致性及本地校验回归。Gemini / Google AI 扩展规则在 v2.7.30 / v2.7.31 分两轮补齐，当前完成静态规则、双端一致性及本地校验回归；Antigravity 等新增入口的设备端连接日志核验仍待完成。v2.7.32 修复 Clash 域名规则集 `+.` 语法、古典规则集 `no-resolve` 与依赖保留逻辑，当前仅完成静态与离线回归，建议在 Clash Verge Rev 客户端完成 `apple.com` / `bilibili.com` 根域名命中与 DNS 日志核验。v2.7.33 补齐 Clash 依赖保留（DNS `#RULES`、`listeners` / `tunnels`、清理孤立 `sub-rules`、`proxies` 数组校验）及 `Custom` `no-resolve`，并调整双端 Vertex 区域规则、移除共享 CDN `featureassets.org`、将 Canva 中国大陆域名改为直连；当前完成静态回归与 Mihomo 运行时验证，Shadowrocket 端 `DOMAIN-WILDCARD,*-aiplatform.googleapis.com` 与 Canva 直连行为仍建议在设备连接日志中核验。

## 维护

- [维护约定](EXPERIENCE.md)
- [变更记录](CHANGELOG.md)
- [安全说明](SECURITY.md)

修改 AI 手工规则时编辑 `rules/ai-rules.json` 后运行 `node scripts/sync-ai-rules.js` 同步双端；本地发布前运行 `bash scripts/check-config.sh`；私人订阅可使用 `WESTDATA_CONFIG=/path/to/WestData.conf bash scripts/check-config.sh` 单独校验，但不得提交到仓库。GitHub Actions 另每日检查 Maasea YouTube 脚本及 Blackmatrix 关键规则源的可达性和基础结构。
