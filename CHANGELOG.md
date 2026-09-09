# 变更记录

仅保留关键结果。当前用法见 [README](README.md)，完整修改与临时试验见 [Git 历史](https://github.com/vc7k8jhtvc-netizen/shadowrocket-rule/commits/main/)。

## 2026-09-09

- 内部版本升至 `v2.7.10`：补充 DeepSeek 官方域名 `deepseek.com` 直连，覆盖官网、Web Chat 与 API 子域；规则置于 AI 代理规则之前，并同步 Shadowrocket / Clash 与检查器。
- Shadowrocket 内部版本升至 `v2.7.9`：继续 `include = WestData.conf` 以继承 DNS / MITM / Host / Rewrite / 节点；移除特殊 `FINAL` 兜底，改为当前配置层的 `DOMAIN-WILDCARD,*` 与 IPv4 / IPv6 全网段显式终结规则。
- v2.7.9 已完成实机验证：Steam / Wikipedia 域名与直接 IP 均由当前 Routing 显式终结规则接管，专项规则及 WestData MITM 基础能力同时保持正常。
- 优化代理分组展示结构，内部版本升至 `v2.7.8`：总控置顶、业务居中、广告单列、地区节点池置底，并将 `🌍 Global` 重命名为 `🌍 国际兜底`。
- 删除冗余的 `🐟 FINAL` 策略组，内部版本升至 `v2.7.7`。
- 将主分流逻辑改为“中国大陆白名单直连、其余未知流量默认代理”，内部版本升至 `v2.7.6`，删除手工维护的 `Global.list`。

## 2026-09-08

- 广告拦截合并到正式配置，内部版本升至 `v2.7.5`；同步 Clash。
- 🤖 AI 默认出口调整为 `🇸🇬 新加坡`。
- 策略组名称、Emoji、固定文件名与检查器完成整理。

## 2026-09-07 · v2.7.0

- 新增 `Shadowrocket_Routing.conf`：通过 `include = WestData.conf` 继承底座，自己维护策略组与分流。
- Clash 使用扩展脚本重建策略组与规则。
- 增加双端检查、WestData 私人本地验证与 Mihomo 回归验证。

## 2026-09-06

- 恢复 Clash Verge Rev 扩展脚本与 Shadowrocket 并行维护。
- Clash 保留订阅 DNS、hosts、IPv6 和节点入口参数。

## 2026-09-04

- 建立 Shadowrocket 分流配置与远程 Global.list。
