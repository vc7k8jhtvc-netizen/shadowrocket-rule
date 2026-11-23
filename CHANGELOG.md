# 变更记录

## 2026-11-24

- 内部版本升至 `v2.7.36`：修复 AI 分流完整性检查发现的缺口：
  - OpenAI / ChatGPT 补齐 `chat.com`、`chatgpt.site`、`crixet.com`、`openai.org`、`sora.com`、OpenAI 专属 CDN/Azure/WebPubSub 主机与 Sentry 主机；Claude / Anthropic 补齐 `ant.dev`、`anthropic.team`、`chatbotclaude.com`、`clau.de`、`claude.app`、`claude.site`、`claudepages.dev`、MCP/Studio 等专属域名；Grok 补齐 `grok.x.com`、`grokbot.com`，避免前者被 Twitter 规则截走。
  - 新增 `OpenAI_Voice.list` 与 `scripts/sync-openai-voice-rules.js`，从 OpenAI 官方 `chatgpt-voice.json` 生成 411 条主机 IP 路由；双端在 AI 域名规则之后、Apple 之前接入“🤖 AI”，并加入 `chatgpt.livekit.cloud`、`host.livekit.cloud`、`turn.livekit.cloud`，使 ChatGPT Voice 的 LiveKit/TURN 与 UDP/3478 服务器不再落到香港兜底出口。
  - 新增 `check-openai-voice-rules.js`，拒绝宽网段、重复项、缺失 `no-resolve` 或未知语法；外部依赖巡检下载官方 JSON 校验列表新鲜度，Mihomo runtime、双端一致性、Claude/Grok 完整性及漂移负例同步扩展。共享 WorkOS / Intercom / Stripe / Cloudflare / Apple / Datadog 主机仍保持原分流。
- 内部版本升至 `v2.7.35`：精简 `Custom.list` 并为成人网站新设双端“🔞 NSFW”分组：
  - 从 `Custom.list` 移除效率工具分类（Notion / Dropbox / Slack / Atlassian 共 25 条，改由正常兜底规则处理）；`hero-sms.com` 与 `greasyfork.org` 保留在 `Custom.list` 的“其他”分类下。
  - 将原 `Custom.list` 中的 48 条成人网站规则（JapaneseASMR、ASMR.one、Pornhub、XVideos、XNXX、xHamster、RedTube、YouPorn、Tube8、SpankBang、Eporner、TNAFlix、Jable、MissAV、Hanime1）拆出至独立共享清单 `Adult.list`。
  - Shadowrocket 与 Clash 双端新增“🔞 NSFW”策略组（默认“🚀 默认代理”，可选五个地区与“👆 手动选择”，位于“🧩 自定义”后、“🐟 漏网之鱼”前），并接入 `Adult.list` 规则集（Clash 端附加 `,no-resolve`），顺序位于 `Custom` 后、`China` 前。
  - 同步更新双端一致性校验、规则语法/去重/跨清单防重校验、负例回归及文档。
- 内部版本升至 `v2.7.34`：落地审计项 L7（构建期单一数据源，不新增远端 Provider）：
  - 新增 `rules/ai-rules.json` 作为双端手工 AI 分流规则（8 个分组、136 条规则）的单一数据源，新增 `scripts/sync-ai-rules.js` 支持写回生成（`node scripts/sync-ai-rules.js`）与同步检查（`--check`），并严格校验规则语法、去重与标记完整性。
  - `Shadowrocket_Routing.conf` 与 `Clash_Verge_Rev_Script.js` 在 AI 规则区块加入同步起止标记，由同步脚本自动维护，双端实际生效规则、顺序与客户端行为与 `v2.7.33` 完全一致。
  - `check-config.sh` 接入 `node scripts/sync-ai-rules.js --check`，`check-validator-regressions.js` 同步补充源/产物漂移、非法规则、重复条目、标记缺失及写回恢复回归（覆盖 LF / CRLF 双换行）。
- 内部版本升至 `v2.7.33`：修复全量审计发现的兼容性、输入校验与规则精度问题：
  - **DNS `#RULES` 保留标签**：`Clash_Verge_Rev_Script.js` 的 `preserveDnsServer()` 原样放行 Mihomo 保留标签 `#RULES`（`tunnel.DnsRespectRules`），避免包含该标签的合法订阅被误判为缺失策略并拒绝生成。
  - **附属结构依赖与校验**：保留订阅 `listeners[].proxy` 与 `tunnels`（对象与紧凑字符串格式）所引用的策略组；移除随 `rules` 重建而孤立的 `sub-rules`（若 `listeners[].rule` 引用 `sub-rules` 则 fail-closed 拒绝）；补齐保留策略组 `proxies` 非数组时的统一中文错误拦截，消除未处理 `TypeError`。
  - **规则精确化与共享依赖收敛**：双端移除 Statsig 共享 CDN `featureassets.org`（恢复正常分流并加入 hardening 共享 SaaS 禁止列表）；Canva 可画中国大陆域名（`canva.cn`、`canva-apps.cn`、`canva-code.cn`、`my.canvasite.cn`）由“🤖 AI”改为 `DIRECT`；Vertex 区域主机由 `DOMAIN-KEYWORD,-aiplatform.googleapis.com` 收窄为 `DOMAIN-WILDCARD,*-aiplatform.googleapis.com`，消除仿冒子域误匹配；Clash `RULE-SET,Custom,🧩 自定义` 补齐 `,no-resolve`，与其余 `GEOIP` 前古典规则集及 README 表述保持一致。
  - **回归覆盖**：`check-routing-hardening.js`、`check-mihomo-runtime.js`、`check-dual-client.js` 与 `check-validator-regressions.js` 同步补充上述正负例断言；规则集下载继续沿用“🚀 默认代理”、YouTube 模块继续跟随 Maasea `master` 分支。
- 内部版本升至 `v2.7.32`：修复全量审计发现的五项问题（H1 / H2 / M1 / M2 / M3）：
  - **H1**：Clash `Apple_Domain` 与 `China_Domain` 改用上游 Clash 专用 `Apple_Domain.yaml` / `China_Domain.yaml`（`behavior: domain` + `format: yaml`，使用 `+.` 语法），修复此前 `.domain` 前缀导致全部 Apple / 中国根域名在 Mihomo 中漏匹配的问题；`check-external-dependencies.sh` 同步校验 Clash 域名规则集必须使用 `+.` 且拒绝裸 `.` 条目。
  - **H2**：Clash 全部 `GEOIP,CN,DIRECT` 之前的古典规则集（`Lan`、`Apple`、`Microsoft`、`GitHub`、`Telegram`、`Twitter`、`Instagram`、`TikTok`、`YouTube`、`Google`、`China`）统一附加 `,no-resolve`，消除非 AI 域名在 `RULE-SET,Apple` 处提前触发 DNS 解析的问题，与 Shadowrocket 上游规则语义对齐；`check-mihomo-runtime.js` 扩展 DNS 静默测试至全部 `GEOIP` 前规则。
  - **M1**：加固 `Clash_Verge_Rev_Script.js` 依赖保留与输入校验——支持保留 DNS 服务器 URL 中的 `#策略组` 标签及 `nameserver-policy` 混合键（如 `example.com,rule-set:...`）、隔离冲突的保留规则集磁盘 `path`，并 fail-closed 拒绝无效 `proxies` / `proxy-groups` / `provider` 条目。
  - **M2**：静态 `proxies` 订阅地区池为空时改为 `['REJECT']`（与 `proxy-providers` 模式一致），避免新加坡等地区暂时无节点时 `🤖 AI` 经“👆 手动选择”静默回退至香港节点。
  - **M3**：`check-dual-client.js` 与 `check-shadowrocket-routing.js` 补齐全部 14 个外部规则集与 `bytedance` 直连位置的完整顺序校验；`check-config.sh` 接入离线 `check-external-dependencies.test.sh`；`check-external-dependencies.yml` 补充 `push: [main]` 触发离线回归并将在线巡检限定在 `schedule` / `workflow_dispatch`；`check-validator-regressions.js` 补齐 H1 / H2 / 非 AI 顺序与 YouTube SHA 固定负例。
- 内部版本升至 `v2.7.31`：补齐 Google Antigravity（`antigravity.google` / `antigravity.google.com`、`antigravity.googleapis.com`、`antigravity-pa.googleapis.com`、`antigravity-unleash.goog`）以及 Google Labs / Flow / Opal / Stitch / AI Test Kitchen、Gemma、Gemini Web 后端、Workspace Gemini、Gemini Enterprise 等专属入口，全部双端归入“🤖 AI”。共享认证与通用 API 主机（如 `accounts.google.com`、`www.googleapis.com`、`apis.google.com`、`firebaseinstallations.googleapis.com`、`play.google.com`）继续保持原分流，避免影响其他 Google 服务；hardening 同步扩展正负匹配断言。
- 内部版本升至 `v2.7.30`：将 Gemini Web / API、Google AI Studio、Gemini Notebook（原 NotebookLM）、DeepMind、Vertex AI 的 Gemini 接口与 Gemini Code Assist 的 45 个专属域名后缀及 Vertex 区域 `-aiplatform.googleapis.com` 关键字规则统一加入 Shadowrocket / Clash 双端“🤖 AI”。`www.googleapis.com`、`apis.google.com`、`www.google.com`、YouTube、广告与分析等共享 Google 主机继续沿用原业务分组，避免全局接管其他 Google 服务；新增 hardening 域名清单、顺序、正负匹配与双端一致性断言。

## 2026-11-19

- 内部版本升至 `v2.7.29`：统一 Shadowrocket / Clash 业务组的地区候选，`🤖 AI`、`🍎 Apple`、`🔎 Google`、`💻 GitHub`、`🪟 Microsoft`、`📱 社交媒体`、`▶️ YouTube`、`✈️ Telegram`、`🧩 自定义` 与 `🐟 漏网之鱼` 现在都可直接选择香港、台湾、新加坡、日本、美国和“👆 手动选择”。各组首个默认出口、规则顺序与分流行为保持不变；新增双端候选完整性断言。
- 内部版本升至 `v2.7.28`：仅整理 `Shadowrocket_Routing.conf` 的注释层级与措辞，统一分区标题、压缩重复说明并移除运行配置中的历史备注和冗长验证清单。代理组顺序、候选节点、规则顺序、默认出口及分流行为均保持不变；同步更新注释相关回归锚点与 README。
- 内部版本升至 `v2.7.27`：将 Supabase 的 `supabase.com` / `supabase.co` / `supabase.in` 与 Hugging Face 的 `huggingface.co` / `hf.co` / `hf.space` 从 `Custom.list` 的“🧩 自定义”转移至 Shadowrocket / Clash 双端“🤖 AI”；同时将 JapaneseASMR、ASMR.one 在 `Custom.list` 内归入成人网站分类。扩展 hardening 断言与负例，确保六个迁移后缀位于 Custom 之前且不得重新进入 `Custom.list`；不新增策略组、Provider、MITM 或 DNS。
- 内部版本升至 `v2.7.26`：将 Exa、Tavily 的网站、API、控制台、文档与 MCP 入口从 `Custom.list` 的“🧩 自定义”转移至 Shadowrocket / Clash 双端“🤖 AI”，对应 `exa.ai`、`tavily.com` 两个自有后缀。新增 hardening 断言与负例，确保规则位于 Custom 之前，且两个域名不得重新进入 `Custom.list`；不新增策略组、Provider、MITM、DNS 或共享第三方域名。
- 内部版本升至 `v2.7.25`：为 Shadowrocket / Clash 的现有 🤖 AI 分组新增 Canva 自有域名分流，覆盖 `canva.com`、`canva.cn`、`canva.ai`、`canva.app`、`canva.dev`、`canva.me`、`canva.site`、`canva.link`、`canva.run`、`canva-apps.com`、`canva-apps.cn`、`canva-hosted-embed.com`、`canva-code.cn`、`canvacode.com`、`my.canvasite.cn` 与 `canvastatus.com`。规则位于 Claude 后、Apple 前，不新增策略组、Provider、MITM、DNS，也不引入共享 CDN。
- `check-routing-hardening.js` 新增 Canva 域名清单、顺序与双端一致性断言；负例回归覆盖单端删除及错误出口，避免规则被静默删除或漂移。本轮当前仅完成静态规则与双端一致性回归，设备端连接日志核验待完成。

## 2026-11-08

- 内部版本升至 `v2.7.24`：将个人 AI 中转 `a6api.vip` / `a6api.com` 正式纳入双端“🤖 AI”，作为 OpenAI 自有域名之外的显式个人例外；新增 `check-routing-hardening.js` 断言与双端漂移负例，避免规则被静默删除或单端改动。
- 修复 `check-validator-regressions.js` 在 CRLF 检出下负例失效的问题：读取统一规范化为 LF、写回保持目标换行，并在注入未生效时立即失败；回归同时覆盖 LF 与 CRLF。新增 `.gitattributes` 固定 `eol=lf`，避免 Windows / macOS 检出再次漂移。
- `check-config.sh` 补充语法覆盖：纳入 `check-validator-regressions.js` 的 `node --check`，以及对 `check-external-dependencies.sh`、`check-external-dependencies.test.sh` 的 `bash -n`。
- CI 校验基线升级至 Mihomo `v1.19.33`（含 CVE-2026-97031 的 `crypto/tls` 修复）；扩展脚本仍不改写订阅 `tun` 字段，未设置 `tun.stack` 时遵循核心默认值。
- `README` 说明 `Custom.list` 含个人用途的成人站点域名，不构成推荐；同步验证状态：v2.7.24 当时仅通过静态回归与 Mihomo 加载验证，设备端回归待完成。（该验证欠账已于同日随 `v2.5.10` 回归关闭，见下方「状态更新」条。）
- 维护约定更新：修改 `Shadowrocket_Routing.conf` 或 `Clash_Verge_Rev_Script.js` 时必须同步当前 CHANGELOG 版本段；该项为文档约定，不新增 CI 强制。
- 上游版本核对（仅文档）：Clash Verge Rev 最新正式版为 `v2.5.10`（2026-11-03），其中 `v2.5.9` 将内置 Mihomo 内核升至 `v1.19.33`，与 CI 基线一致；Shadowrocket 最新版为 `2.2.93`（2026-10-29），改动集中在 macOS 菜单栏、tunnel 路由选项优先级、iCloud 同步与全局通配 MITM 匹配崩溃修复。两端均未变更本项目依赖的规则与配置语义，`Shadowrocket_Routing.conf`、`Clash_Verge_Rev_Script.js`、`Custom.list` 无需修改，内部版本保持 `v2.7.24`。
- README 与维护约定补充升级核对项：`v2.5.9` 起应用层「DNS 覆写」需与脚本 `preserveDns()` 保留的订阅 DNS 保持一致；`GEOIP,CN,DIRECT` 依赖 `v2.5.10` 的服务模式 GEO 库回写修复；Windows 覆盖安装前需完全退出客户端。客户端验证基线当时仍为 `v2.5.8`，`v2.7.23` / `v2.7.24` 设备端回归当时仍未完成。（该基线已于同日刷新为 `v2.5.10`，见下方「状态更新」条。）
- 状态更新：`v2.7.24` 设备端回归已在 Clash Verge Rev `v2.5.10`（内置 Mihomo `v1.19.33`，与 CI 基线一致）上完成并通过，覆盖 `v2.7.23` / `v2.7.24` 累计改动；`a6api.vip` / `a6api.com` 按预期进入“🤖 AI”。此前“设备端回归待完成”的状态至此关闭，客户端验证基线由 `v2.5.8` 刷新为 `v2.5.10`。本轮仅更新文档，内部版本保持 `v2.7.24`。
- 修复本地门禁语法覆盖缺口（审计 M4）：`check-config.sh` 的 `node --check` 改为遍历根目录主脚本与 `scripts/` 下全部 JS 文件，补齐此前遗漏的 `check-clash-script.js` 与 `check-mihomo-runtime.js`，并新增后者存在性检查；以遍历代替逐项列举，避免新增校验器再次被遗漏。维护约定同步修正「覆盖全部 JS 校验器」的表述，明确 `check-mihomo-runtime.js` 依赖 CI 下载并校验的 Mihomo 二进制、本地只做语法检查。仅改门禁与文档，内部版本保持 `v2.7.24`。
- 修复负例回归覆盖缺口（审计 M6）：`check-validator-regressions.js` 的 fixtures 改为由 `git ls-files` 动态生成，覆盖全部跟踪文件；LF / CRLF 双换行下对全部 JS 校验器执行 `node --check`，shell 门禁按换行分别检查原文件（LF）或归一化 LF 副本（CRLF）；新增 `check-routing-hardening.js` 漂移负例，并以源码级断言锁定 `check-mihomo-runtime.js` 的关键运行时断言与 `check-config.sh` 的 M4 遍历式语法门禁（两者分别因依赖 Mihomo 二进制、在套件内执行会递归而不实际运行）。同步修订同日段内两处过时的验证状态表述（审计 L4），明确「当时」并指向下方「状态更新」条。仅改校验器与文档，内部版本保持 `v2.7.24`。
- 修复 CI 回归：上一提交在 CRLF 轮直接对 shell 门禁执行 `bash -n`，Linux bash 无法解析 CRLF 脚本（Windows Git Bash 可容忍，本地门禁未能复现），导致 `Check configuration` 在 `scripts/check-config.sh` 报 `syntax error near unexpected token 'do\r'`。现改为 CRLF 轮对归一化 LF 副本执行 `bash -n` 并断言副本不含 `\r`，LF 轮仍直接检查原文件；同步修正维护约定与上一条记录中的表述。仅改回归校验器与文档，内部版本保持 `v2.7.24`。

## 2026-10-10

- 内部版本升至 `v2.7.23`：Shadowrocket / Clash 同步收窄 OpenAI / ChatGPT 手工分流，只强制 OpenAI 自有或实例专属主机进入“🤖 AI”；WorkOS、Intercom、Stripe、Cloudflare、Apple、Datadog 等 OpenAI 会使用但并非专属的共享依赖恢复正常分流，避免全局接管其他应用流量。
- Clash 新增订阅命名空间与依赖 fail-closed：拒绝重复节点名、节点名与项目策略组冲突、缺失策略引用、缺失 proxy-provider，并保持失败前不部分写回配置；WestData 本地 checker 同步拒绝重复节点名。
- 外部依赖定时巡检从 Maasea YouTube 脚本扩展到 Shadowrocket / Clash 使用的 Blackmatrix 规则源，检查可达性、异常内容和 Clash Provider 基础结构；PR 阶段继续只跑离线回归，避免临时网络故障阻塞合并。
- CI 校验基线为 Mihomo `v1.19.32`。该版本将默认 TUN 栈改为 `mips`；扩展脚本不改写订阅中的 `tun` 字段，也不设置 `tun.stack`。订阅明确设置的值继续保留，未设置时遵循 Mihomo 核心默认值。
- Clash Verge Rev `v2.5.8` 客户端版本已完成实机验证；该结论对应 v2.7.22 及此前配置。`v2.7.23` 的新路由与 fail-closed 改动已通过静态回归和 Mihomo `v1.19.32` 加载验证，但尚未完成新的设备端回归。

## 2026-10-06

- 内部版本升至 `v2.7.22`：YouTube 增强模块的 `youtube.response.js` / `youtube.request.js` 改为直接引用 `Maasea/sgmodule` 的 `master` 分支，不再固定 commit SHA；上游更新自动生效，无需人工维护脚本版本。同步更新校验器，要求脚本路径必须跟随 `master`，并拒绝重新锁定 40 位 commit SHA。
- `WestData.conf` 已确认上游内容无变化，无需因文件时间较旧而刷新；当前扩展脚本在 Clash Verge Rev `v2.5.7` 正式版测试正常；Claude / Anthropic 分流及当时的 YouTube 专项增强 / Shorts 屏蔽均完成设备端验证并通过。

## 2026-09-30

- 内部版本升至 `v2.7.21`：Clash 重建分流时保留节点 dialer-proxy、Provider 下载策略及 DNS rule-set 引用所需的订阅依赖，独立命名并同步更新引用，修复原本有效的订阅转换后无法加载的问题；失败时不部分改写输入。
- 凭据扫描改为逐匹配豁免占位值，避免无关注释或同行占位值掩盖凭据；YouTube response/init 缺少 argument 时拒绝通过。补充静态负例与 Mihomo 依赖加载回归，版本漂移负例改为自动匹配当前版本。

## 2026-09-23

- 内部版本升至 `v2.7.20`：移除扩展脚本对 `mode` 的强制赋值，遵循 Clash Verge Rev 应用设置优先级；客户端运行模式请设为“规则”。同步调整静态回归校验。

仅保留关键结果。当前用法见 [README](README.md)，完整修改与临时试验见 [Git 历史](https://github.com/vc7k8jhtvc-netizen/shadowrocket-rule/commits/main/)。

## 2026-09-18

- YouTube 专项模块默认开启 Maasea 原生 `blockShorts:true`，用于屏蔽 Shorts 导航入口；不新增 Shorts 域名拦截、不扩大 MITM、不更换固定上游脚本。新增自动检查，防止该开关回退并锁定其他参数。仅确认配置与 CI；当前开关不保证封锁所有 Shorts 视频，客户端呈现仍待设备实测。
- 内部版本升至 `v2.7.19`：为 Shadowrocket / Clash 的现有 🤖 AI 分组新增 Claude/Anthropic 四个专属域名后缀 `claude.ai`、`claude.com`、`anthropic.com`、`claudeusercontent.com`，涵盖网页、API 与 Artifacts；不新建分组、不引入共享 CDN、MITM 或 DNS，原有出口与顺序保持不变。新增双端规则回归测试；设备验证待完成。
- 内部版本升至 `v2.7.18`：移除 Shadowrocket 与 Clash 的通用 Advertising 规则、Providers 及广告策略组；原有业务分流、国内直连、Custom.list、兜底及 WestData 基础订阅均保持原有职责。
- YouTube 合并模块去除第三方 Advertising MITM 主机，仅保留 `*.googlevideo.com`、`youtubei.googleapis.com` 与既有 YouTube 脚本、UDP 回退规则。同步更新检查器、文档；本次设备端误杀回归仍待实际验证。

## 2026-09-15

- 内部版本升至 `v2.7.17`：将 YouTube 增强与 Advertising 官方 HTTPS MITM 主机范围合并为单一 Shadowrocket 模块，保留原有脚本/规则与安全边界；删除独立广告模块及其专用校验器，私人 `WestData.conf` 不变。
- 内部版本升至 `v2.7.16`：修复 Clash 错用 Shadowrocket `China_Domain.list` 的问题，改用上游 Clash `China_Domain.txt`；移除 Clash `GEOIP,CN,DIRECT` 的 `no-resolve`，与 Shadowrocket 保持中国直连语义一致。
- 新增可选 `Advertising.MITM.Shadowrocket.sgmodule`，仅提供官方广告主机名的 HTTPS MITM 覆盖；不修改私人 `WestData.conf`，并加入模块范围、CA 安全与中国规则语义回归检查。

## 2026-09-10

- 修复同一日期下多条版本记录导致的 CI 版本校验误报；恢复 Clash 检查器生成 Mihomo 测试配置，并支持通过 `WESTDATA_CONFIG` 校验本地私有订阅。
- 内部版本升至 `v2.7.15`：恢复原 `Global.list` 的完整个人规则内容并更名为 `Custom.list`，原“🌍 Global”策略组改为“🧩 自定义”；规则恢复到 Google 之后、中国规则之前。Shadowrocket / Clash 双端同步；“🐟 漏网之鱼”仍保持最终兜底，不恢复旧 FINAL 架构。
- 内部版本升至 `v2.7.14`：补齐 Grok / xAI 功能域名，新增 `grokusercontent.com`、`grok-sandbox.com`、`groktpcontent.com`、`grok.me`、`grokipedia.com` 与 `featureassets.org` 到“🤖 AI”，并同步 Shadowrocket / Clash；共享广告、统计与 Cookie 依赖不纳入 AI。

## 2026-09-09

- 内部版本升至 `v2.7.13`：将“🌍 国际兜底”重命名为“🐟 漏网之鱼”，并把 UI 位置移动到“🛑 广告拦截”之后；默认出口与候选项不变，Shadowrocket / Clash 及检查器同步。
- 内部版本升至 `v2.7.12`：“🌍 国际兜底”增加 `DIRECT` 候选项，并保留“👆 手动选择”。
- 内部版本升至 `v2.7.11`：“🌍 国际兜底”增加“👆 手动选择”候选项。
- 内部版本升至 `v2.7.10`：补充 DeepSeek 官方 `deepseek.com` 域直连。
- Shadowrocket 内部版本升至 `v2.7.9`：保留 `include = WestData.conf`，使用显式域名 / IP 终结规则隔离 WestData `[Rule]`。
- v2.7.9 已完成实机验证。
- 内部版本升至 `v2.7.8`：优化代理分组展示结构。
- 内部版本升至 `v2.7.7`：删除冗余的旧 FINAL 策略组。
- 内部版本升至 `v2.7.6`：改为“中国大陆白名单直连、其余未知流量默认代理”，当时删除 `Global.list`。

## 2026-09-08

- 广告拦截方案合并到正式 Shadowrocket / Clash 配置。
- 策略组名称、Emoji、固定文件名与检查器完成整理。

## 2026-09-07 · v2.7.0

- 新增 `Shadowrocket_Routing.conf` 轻量分流层，继承 WestData 基础能力。
- Clash 使用扩展脚本重建策略组与规则。
- 增加双端检查、WestData 私人本地验证与 Mihomo 回归验证。

## 2026-09-06

- 恢复 Clash Verge Rev 与 Shadowrocket 并行维护。

## 2026-09-04

- 建立 Shadowrocket 分流配置与远程 Global.list。
