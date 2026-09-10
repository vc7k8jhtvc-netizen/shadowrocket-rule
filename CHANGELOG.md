# 变更记录

仅保留关键结果。当前用法见 [README](README.md)，完整修改与临时试验见 [Git 历史](https://github.com/vc7k8jhtvc-netizen/shadowrocket-rule/commits/main/)。

## 2026-09-10

- 内部版本升至 `v2.7.15`：恢复原 `Global.list` 的完整个人规则内容并更名为 `Custom.list`，原“🌍 Global”策略组改为“🧩 自定义”；规则恢复到 Google 之后、中国规则之前。Shadowrocket / Clash 双端同步；“🐟 漏网之鱼”仍保持最终兜底，不恢复旧 FINAL 架构。
- 内部版本升至 `v2.7.14`：补齐 Grok / xAI 功能域名，新增 `grokusercontent.com`、`grok-sandbox.com`、`groktpcontent.com`、`grok.me`、`grokipedia.com` 与 `featureassets.org` 到“🤖 AI”，并同步 Shadowrocket / Clash；共享广告、统计与 Cookie 依赖不纳入 AI。

## 2026-09-09

- 内部版本升至 `v2.7.13`：将“🌍 国际兜底”重命名为“🐟 漏网之鱼”，并把 UI 位置移动到“🛑 广告拦截”之后；默认出口与候选项不变，Shadowrocket / Clash 及检查器同步。
- 内部版本升至 `v2.7.12`：“🌍 国际兜底”增加 `DIRECT` 候选项，并保留“👆 手动选择”；默认仍为“🚀 默认代理”，Shadowrocket / Clash 同步。
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
