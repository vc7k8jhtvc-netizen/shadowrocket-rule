# 变更记录

仅保留关键结果。当前用法见 [README](README.md)，完整修改与临时试验见 [Git 历史](https://github.com/vc7k8jhtvc-netizen/shadowrocket-rule/commits/main/)。

## 2026-09-09

- Shadowrocket 内部版本升至 `v2.7.9`：保留 `include = WestData.conf` 以继续继承 DNS / MITM / Host / Rewrite / 节点；移除特殊 `FINAL` 兜底，改用当前配置层的 `DOMAIN-WILDCARD,*` 与 IPv4 / IPv6 全网段显式终结规则，目标是让所有剩余流量在进入 WestData `[Rule]` 前由“🌍 国际兜底”接管。该跨 include 编译行为需以实机连接日志验证。
- 优化代理分组展示结构，内部版本升至 `v2.7.8`：将“🚀 默认代理 / 🌍 国际兜底 / 👆 手动选择”置顶，业务分组居中，广告拦截单列，地区节点池下沉到底部；同时将 `🌍 Global` 重命名为 `🌍 国际兜底`，不改变实际分流语义。
- 删除冗余的 `🐟 FINAL` 策略组，内部版本升至 `v2.7.7`：Shadowrocket `FINAL` 与 Clash `MATCH` 直接指向 `🌍 Global`。
- 将主分流逻辑改为“中国大陆白名单直连、其余未知流量默认代理”，内部版本升至 `v2.7.6`：移除两端对 `Global.list` 的引用并删除手工维护的 `Global.list`。

## 2026-09-08

- 将完成实机试用且无异常的广告拦截方案合并到正式 `Shadowrocket_Routing.conf`，内部版本升至 `v2.7.5`；同步加入 Clash 扩展脚本。
- 补齐检查器盲点、地区筛选交叉校验、版本一致性检查与敏感信息扫描。
- 🤖 AI 默认出口调整为 `🇸🇬 新加坡`。
- 策略组名称与 Emoji 完成轻量化整理。
- Shadowrocket 主配置固定为 `Shadowrocket_Routing.conf`。

## 2026-09-07 · v2.7.0

- 新增 `Shadowrocket_Routing.conf`：通过 `include = WestData.conf` 继承底座，自己维护策略组与分流。
- Clash 使用扩展脚本重建策略组与规则。
- 增加双端检查、WestData 私人本地验证与 Mihomo 回归验证。

## 2026-09-06

- 恢复 Clash Verge Rev 扩展脚本与 Shadowrocket 并行维护，共用 Global.list。
- Clash 保留订阅 DNS、hosts、IPv6 和节点入口参数。
- 加入双端检查、私人 WestData 本地验证与敏感信息扫描。

## 2026-09-04

- 建立 Shadowrocket 分流配置与远程 Global.list。
