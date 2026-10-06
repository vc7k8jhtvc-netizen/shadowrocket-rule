# 变更记录

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
