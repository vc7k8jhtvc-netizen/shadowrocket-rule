# 维护约定

安装、默认出口及日常排查见 [README](README.md)。

## 架构

Shadowrocket 以 `Shadowrocket_Routing.conf` 为唯一主配置：

- `WestData.conf`：节点、General / DNS / TUN、Host、URL Rewrite、MITM 与供应商基础设置；私人文件不得提交仓库。
- `Shadowrocket_Routing.conf`：仅 Proxy Group 与 Rule，不含通用广告策略组或 Advertising 黑名单。
- `Custom.list`：两端共用的个人显式自定义域名规则，由原 `Global.list` 恢复并更名；已提升为专项 AI 分组的 Exa、Tavily、Supabase、Hugging Face 不再收录，JapaneseASMR 与 ASMR.one 归入成人网站分类。
- `YouTube.Enhance.Shadowrocket.sgmodule`：仅 YouTube 增强脚本、专属规则与两个专属 MITM 主机；不包含 CA 材料及通用 Advertising MITM 范围；脚本直接跟随 `Maasea/sgmodule` 的 `master` 分支。
- Clash Verge Rev：保留订阅基础参数，通过扩展脚本重建策略组与规则，无通用广告 Providers。

## 外部配置文档

- 本项目的 `.conf`、`.yaml` 配置文档保存在 Google Drive；必要时可通过 ChatGPT 的 Google Drive 插件调用，用于读取、核验、比对或维护。
- 私人订阅及其他敏感配置仍不得提交 GitHub。
- `WestData.conf` 是供应商维护的只读订阅输入；项目不得要求修改其 General、Host、URL Rewrite、MITM、节点服务器或 TLS 参数来满足仓库检查。
- 本地 WestData 检查只验证项目实际依赖的节点选择契约：存在受支持的 `[Proxy]` 节点、节点命名与筛选器兼容、香港/台湾/新加坡/日本/美国核心节点池非空；不固定供应商内部实现细节。
- `WestData.conf` 是否需要更新以订阅上游实际内容变化为准，不以文件生成时间或 Drive 修改时间单独判断；确认内容无变化时无需仅为刷新时间戳而更新。
- 私有 Drive 文件通过文件名与当前元数据定位，不在仓库文档中固化 Google Drive file ID，避免文件替换后形成失效引用。

## 修改范围

| 修改内容 | 维护要求 |
|---|---|
| 个人显式自定义域名 | 只修改 `Custom.list`；不得重新使用 `Global.list` 名称 |
| 个人 AI 中转（非 OpenAI 自有域名） | 仅限归属明确的个人中转，只改双端 AI 手工规则；必须同步 `check-routing-hardening.js` 断言与 CHANGELOG，不得扩大为共享域名后缀 |
| Canva 等专项 AI 自有域名 | 只改双端 AI 手工规则；同步 `check-routing-hardening.js` 与 CHANGELOG，不引入共享 CDN 或第三方统计域 |
| Gemini / Google AI 专属域名 | 只改双端 AI 手工规则；覆盖 Gemini、AI Studio、Gemini Notebook、Generative Language、Vertex、Code Assist、Antigravity、Labs / Flow / Opal / Stitch 与 Gemini Enterprise 的专属入口，保留 `accounts.google.com`、`www.googleapis.com`、`apis.google.com` 等共享 Google 主机原分流；同步 hardening 与 CHANGELOG |
| Exa / Tavily 等 AI 搜索服务 | 在双端显式归入 `🤖 AI`，从 `Custom.list` 移除；同步 hardening 断言与 CHANGELOG，不得恢复为 Custom 规则集条目 |
| Supabase / Hugging Face | 按用户偏好固定双端 `🤖 AI`，从 `Custom.list` 移除；同步 hardening 断言与 CHANGELOG，不得恢复为 Custom 规则集条目 |
| 未分类流量 | 不维护域名清单；由 🐟 漏网之鱼最终接管 |
| 国内明确应直连服务 | 若中国规则未覆盖且实机落入漏网之鱼，增加最小必要官方域名直连例外 |
| 专项规则、策略组、节点筛选或规则顺序 | 同步修改并检查 Shadowrocket Routing 与 Clash |
| 通用广告拦截 | 自 v2.7.18 移除；不得重新引入 Advertising 规则、策略组或第三方广告 MITM 主机；仅保留 YouTube 专项增强 |
| Shadowrocket 基础网络参数 | Routing 不复制，由被包含的 WestData.conf 负责 |

## 必须保留的行为

- Routing 的 `[General]` 只能保留 `include = WestData.conf`。
- DeepSeek 官方 `deepseek.com` 固定 DIRECT。
- “🧩 自定义”默认“🚀 默认代理”，候选为默认代理、香港、台湾、新加坡、日本、美国与“👆 手动选择”；`Custom.list` 位于 Google 后、中国规则前。
- “🐟 漏网之鱼”默认“🚀 默认代理”，保留 DIRECT 与“👆 手动选择”。
- 分流顺序：LAN → DeepSeek → AI → Apple/Microsoft/GitHub/Telegram 等专项 → 社交媒体/YouTube/Google → Custom → China/China_Domain/GEOIP → 漏网之鱼。
- Gemini / Google AI 专属入口固定“🤖 AI”并位于 Google 规则集之前；共享 Google 主机不得仅为 Gemini 被全局接管。
- Shadowrocket 不使用 FINAL；末尾固定为 DOMAIN-WILDCARD、IPv4 和 IPv6 三条显式终结规则；Clash 最终使用 MATCH。
- 代理分组显示顺序：总控 → 业务（含自定义）→ 漏网之鱼 → 地区节点池，不得出现“🛑 广告拦截”。
- 两端节点筛选使用相同、区分大小写的 WestData 命名规则。
- 所有业务组及“🐟 漏网之鱼”均须包含香港、台湾、新加坡、日本、美国五个地区选项与“👆 手动选择”；新增地区组时同步两端、候选断言和文档，首个默认出口不得改变。
- Clash 保留订阅 DNS/hosts/IPv6/节点入口；Apple / 中国域名 Provider 统一使用上游 Clash 专用 `Apple_Domain.yaml` / `China_Domain.yaml`（`+.` 语法，避免根域名漏匹配）；`GEOIP,CN,DIRECT` 之前的所有古典规则集统一使用 `no-resolve` 避免提前 DNS 解析，`GEOIP,CN,DIRECT` 本身不使用 `no-resolve`。
- Clash 空地区节点池无论来自静态 `proxies` 还是 `proxy-providers`，一律以 `REJECT` 失败关闭，不得静默回退至“👆 手动选择”导致跨区误路由。
- Clash 额外保留节点 `dialer-proxy`、Provider 下载策略、DNS 服务器 `#策略组` 标签以及 DNS `rule-set:` 引用（含混合 `nameserver-policy` 键）所需的订阅依赖；依赖组追加在业务/地区组之后，依赖组与规则集采用独立名称及非冲突缓存 `path` 并同步更新引用，避免覆盖业务配置。检查依赖失败时不得部分改写订阅。
- Clash 必须拒绝无效节点/策略组对象、重复节点名、节点名与项目策略组冲突、缺失策略引用及缺失 proxy-provider；这些异常不得延迟到 Mihomo 加载阶段才暴露。
- OpenAI 官方允许列表中的共享 WorkOS / Intercom / Stripe / Cloudflare / Apple / Datadog 主机不得被全局强制归入 AI；仅 OpenAI 自有或实例专属主机使用手工 AI 规则。个人 AI 中转 `a6api.vip` / `a6api.com` 是显式声明的例外，由 hardening 断言锁定，不得再扩大范围。
- Exa、Tavily 固定使用双端 `DOMAIN-SUFFIX,exa.ai,🤖 AI` 与 `DOMAIN-SUFFIX,tavily.com,🤖 AI`，且不得重新出现在 `Custom.list`；顺序必须位于 Custom 规则之前。
- Supabase 的 `supabase.com` / `supabase.co` / `supabase.in` 与 Hugging Face 的 `huggingface.co` / `hf.co` / `hf.space` 固定使用双端 `🤖 AI`，不得重新出现在 `Custom.list`；顺序必须位于 Custom 规则之前。
- Canva 自有域名 `canva.com`、`canva.cn`、`canva.ai`、`canva.app`、`canva.dev`、`canva.me`、`canva.site`、`canva.link`、`canva.run`、`canva-apps.com`、`canva-apps.cn`、`canva-hosted-embed.com`、`canva-code.cn`、`canvacode.com`、`my.canvasite.cn`、`canvastatus.com` 必须保持双端“🤖 AI”且顺序位于 Claude 后、Apple 前；不得扩展至共享 CDN，用户绑定的自定义域名无法仅按后缀自动识别。
- YouTube 专属 UDP 拒绝规则仅匹配 googlevideo.com / youtubei.googleapis.com，MITM 主机仅为 `*.googlevideo.com`、`youtubei.googleapis.com`。
- YouTube `youtube.response.js` / `youtube.request.js` 必须直接引用 `Maasea/sgmodule/master`，不得重新锁定 commit SHA；这样上游更新可自动生效，无需人工同步版本。

## 检查与发布

```bash
bash scripts/check-config.sh
```

需要本地订阅检查时：

```bash
WESTDATA_CONFIG=/path/to/WestData.conf bash scripts/check-config.sh
```

检查覆盖：Routing 仅包含 include/Proxy Group/Rule；Custom.list 语法、去重和双端引用；无旧 Global 与 Advertising 运行时配置回归；DeepSeek/OpenAI/Gemini/Grok/Claude/Canva/Exa/Tavily/Supabase/Hugging Face 及全部非 AI 规则序列双端一致；兜底完整；组名称、默认出口及顺序；YouTube 专属 MITM 最小范围、`master` 上游脚本路径及参数；当前树敏感信息；版本一致；Clash 域名 Provider（`Apple_Domain.yaml` / `China_Domain.yaml`）、古典规则集 `no-resolve` 与 `GEOIP` 语义；以及离线外部依赖回归测试。CI 另用 Mihomo 核心验证合成配置、全链路 `GEOIP` 前无提前 DNS 查询及空节点组安全性。静态/CI 通过并不等于真实设备播放或误杀复测完成。

本地门禁同时覆盖语法与换行：`node --check` 遍历根目录主脚本与 `scripts/` 下全部 JS 文件（含仅由 CI 执行的 `check-mihomo-runtime.js`），以文件遍历代替逐项列举，避免新增校验器被遗漏；`bash -n` 与离线单测覆盖外部依赖脚本；负例回归在 LF 与 CRLF 两种换行下各跑一遍，注入未生效即判定失败。仓库用 `.gitattributes` 固定 `eol=lf`，避免 Windows / macOS 检出产生假阴性。`check-mihomo-runtime.js` 依赖 CI 下载并校验的 Mihomo 二进制，本地门禁只做语法检查、不执行运行时回归，因此本地全绿不等于 CI 运行时回归通过。

修改 `Shadowrocket_Routing.conf` 或 `Clash_Verge_Rev_Script.js` 时必须同步当前 CHANGELOG 版本段并递增内部版本；该项为文档约定，不新增 CI 强制校验。

回归还覆盖订阅依赖的名称冲突、传递引用、DNS `#策略组` 标签、混合 `nameserver-policy` 键、缓存路径隔离与 `fake-ip-filter` 引用；Mihomo 验证依赖配置转换前后均可加载。敏感信息白名单仅豁免匹配到的占位值；YouTube response/init 缺失 argument 时拒绝通过；YouTube 脚本若重新固定到 40 位 commit SHA 也必须被拒绝。

负例回归的 fixtures 由 `git ls-files` 动态生成，覆盖仓库全部跟踪文件，避免新增校验器被手写清单遗漏；LF 与 CRLF 两种换行下均对全部 JS 校验器执行 `node --check`；shell 门禁在 LF 轮直接执行 `bash -n`，CRLF 轮因 Linux bash 无法解析 CRLF 脚本（正是 `.gitattributes` 固定 `eol=lf` 的原因）改为对归一化 LF 副本执行 `bash -n`，并断言副本不含 `\r`。`check-routing-hardening.js` 有独立漂移负例；`check-mihomo-runtime.js`（依赖 CI 下载并校验的 Mihomo 二进制）与 `check-config.sh`（在本套件内执行会递归）不实际运行，改以源码级断言锁定关键运行时断言及 M4 的遍历式语法门禁，防止被静默削弱。该源码级断言不能替代 CI 的实际运行时回归。

GitHub Actions 的 `Check external dependencies` 每日独立运行在线巡检：实际下载当前模块引用的 Maasea `master` YouTube 脚本，并检查 Shadowrocket / Clash 当前引用的 Blackmatrix 规则源可达性与基础结构（含 Clash 域名规则集 `+.` 语法校验）；PR 与 `main` 推送仅运行离线 mock 回归，避免临时网络故障阻塞正常提交。该巡检不能替代真实客户端行为验证。

## 2026-11-08 实机验证结论

- `v2.7.24` 的规则调整（个人 AI 中转正式化）与校验器修复已通过全部静态回归、LF/CRLF 双换行负例回归及 Mihomo `v1.19.33` 加载验证。
- 设备端回归已于 2026-11-08 在 Clash Verge Rev `v2.5.10` 上完成并通过，覆盖 `v2.7.23` 与 `v2.7.24` 的累计改动；`a6api.vip` / `a6api.com` 按预期进入“🤖 AI”。
- 客户端版本基线由 `v2.5.8` 刷新为 `v2.5.10`；`v2.5.8` 保留为 `v2.7.22` 及此前配置的历史基线。
- 环境核对（Windows，系统代理模式）：内置 Mihomo `v1.19.33`，与 CI 基线一致；`enable_dns_settings: false`，`preserveDns()` 保留的订阅 DNS 实际生效；`mode: rule`；`tun.enable: false`、`tun.stack: gvisor` 为订阅原值，扩展脚本未改写。
- 上游版本核对（同日）：Clash Verge Rev 最新正式版为 `v2.5.10`（2026-11-03）；Shadowrocket 最新版为 `2.2.93`（2026-10-29），未改变本项目依赖的规则语义、策略组、模块格式或 `include` 行为，因此本轮不修改配置，内部版本保持 `v2.7.24`。
- 未纳入本次复测：Shadowrocket `2.2.93` 的通配 MITM 路径（`*.googlevideo.com` / `youtubei.googleapis.com`）仍建议在实际播放场景中观察，本次结论不覆盖该项。

## 2026-10-10 实机验证结论

- Clash Verge Rev `v2.5.8` 正式版已完成客户端版本验证；该实机结果对应 `v2.7.22` 及此前配置。
- `v2.7.23` 的新路由和 fail-closed 改动已通过静态回归与 Mihomo `v1.19.32` 加载验证，但尚未完成新的设备端回归；在实机复测完成前不得把 `v2.7.23` 标记为实机验证通过。（该验证欠账已于 2026-11-08 随 Clash Verge Rev `v2.5.10` 回归关闭，见上方结论。）
- `v2.5.7` 保留为此前已验证历史客户端基线。

## 2026-10-06 实机验证结论

- `WestData.conf` 已核对，上游实际内容没有变化，因此无需仅因文件时间较旧而更新。
- 当时扩展脚本已在 Clash Verge Rev `v2.5.7` 正式版测试，运行正常。
- Claude / Anthropic 分流已完成设备端验证；网页、应用、API 与 Artifacts 路径结果正常。
- YouTube 专项增强及 Shorts 屏蔽行为已完成设备端验证，结果正常；该结论对应当时上游脚本版本。自 v2.7.22 起 YouTube 脚本自动跟随 `master`，上游行为发生变化时再重新验证。
- 以上结论仅适用于当时配置基线；后续相关规则、上游脚本或客户端行为变化时再重新验证。

## v2.7.18 修正

- 删除 Shadowrocket / Clash 通用 Advertising 规则、Providers 和广告策略组。
- YouTube 模块移除第三方 Advertising MITM 主机，仅保留两个 YouTube 主机及原脚本/UDP 回退规则。
- 同步维护测试与文档；不修改 WestData.conf / Custom.list。

## v2.7.9 实机验证结论

此前已通过 Shadowrocket 日志验证，当前 Routing 的显式终结规则能够隔离 WestData 的旧规则。v2.7.15 恢复 Custom 后，该列表域名应优先命中“🧩 自定义”。当前基线的后续设备验证状态见上方记录。

普通维护可直接更新 main；较大改动按需使用分支/PR。
