# 变更记录

仅保留关键结果。当前用法见 [README](README.md)，完整修改与临时试验见 [Git 历史](https://github.com/vc7k8jhtvc-netizen/shadowrocket-rule/commits/main/)。

## 2026-09-09

- 内部版本升至 `v2.7.13`：将“🌍 国际兜底”重命名为“🐟 漏网之鱼”，并把 UI 位置移动到“🛑 广告拦截”之后；默认出口与候选项不变，Shadowrocket / Clash 及检查器同步。
- 内部版本升至 `v2.7.12`：“🌍 国际兜底”增加 `DIRECT` 候选项，并保留“👆 手动选择”；默认仍为“🚀 默认代理”，Shadowrocket / Clash 同步。
- 内部版本升至 `v2.7.11`：“🌍 国际兜底”增加“👆 手动选择”候选项，默认仍保持“🚀 默认代理”；Shadowrocket / Clash 同步，允许国际兜底临时指定任意 WestData 节点。
- 内部版本升至 `v2.7.10`：补充 DeepSeek 官方 `deepseek.com` 域直连，覆盖官网、Web Chat 与 API 子域；规则置于 AI 代理规则之前，并同步 Shadowrocket / Clash 与检查器。
- Shadowrocket 内部版本升至 `v2.7.9`：继续 `include = WestData.conf` 以继承 DNS / MITM / Host / Rewrite / 节点；移除特殊 `FINAL` 兜底，改为当前配置层的 `DOMAIN-WILDCARD,*` 与 IPv4 / IPv6 全网段显式终结规则，目标是让所有剩余流量在进入 WestData `[Rule]` 前由“🌍 国际兜底”接管。
- v2.7.9 已完成实机验证：`steampowered.com` / `steamstatic.com` 与 `wikipedia.org` / `wikimedia.org` 均命中当前 Routing 的 `DOMAIN-WILDCARD,*`，未落入 WestData 的 DIRECT / PROXY；`1.1.1.1` 等直接 IP 命中当前 Routing 的 `IP-CIDR` 全网段终结规则。专项规则及 WestData MITM 基础能力同时保持正常。
- 优化代理分组展示结构，内部版本升至 `v2.7.8`：将“🚀 默认代理 / 🌍 国际兜底 / 👆 手动选择”置顶，业务分组居中，广告拦截单列，地区节点池下沉到底部；同时将 `🌍 Global` 重命名为 `🌍 国际兜底`，不改变实际分流语义。
- 删除冗余的 `🐟 FINAL` 策略组，内部版本升至 `v2.7.7`：Shadowrocket `FINAL` 与 Clash `MATCH` 直接指向 `🌍 Global`，减少一层无独立业务语义的策略跳转；同步检查器与文档。
- 将主分流逻辑改为“中国大陆白名单直连、其余未知流量默认代理”，内部版本升至 `v2.7.6`：移除两端对 `Global.list` 的引用，🐟 FINAL 默认转入 🌍 Global；删除手工维护的 `Global.list`，同步更新检查器与文档。

## 2026-09-08

- 将完成实机试用且无异常的广告拦截方案合并到正式 `Shadowrocket_Routing.conf`，内部版本升至 `v2.7.5`，正式文件名保持不变；同步加入 Clash 扩展脚本。两端使用 blackmatrix7 完整 Advertising 规则输出，广告组默认 `REJECT`，置于 AI 专项后、其他业务前。

- 补齐检查器盲点：验证所有策略组成员及循环引用；Google 重写检查实际匹配、跳转目标与路径保留；拦截非空 MITM CA 导出字段。增加隔离的正反例回归，不改变运行配置。
- 增加 Shadowrocket / Clash 地区筛选正则交叉校验，补充 Shadowrocket 空地区组说明，并加入 Routing 版本一致性检查；不改变运行配置或正式文件名。
- 🤖 AI 默认出口调整为 `🇸🇬 新加坡`；美国、日本与默认代理仍保留为候选。
- `🌐 Google` 重命名为 `🔎 Google`，`🌐 手动选择` 重命名为 `👆 手动选择`；仅调整策略组显示名称与引用，分流行为不变。
- `📲 Telegram` 重命名为 `✈️ Telegram`；仅调整策略组显示名称，规则与默认出口不变。
- `📱 社交` 重命名为 `📱 社交媒体`，同步 Shadowrocket / Clash 及检查器；规则范围与默认出口不变。
- Shadowrocket 主配置改为固定文件名 `Shadowrocket_Routing.conf`，版本号仅保留在配置头部注释；以后应用内更新可持续使用同一 Raw URL。
- 将台湾策略组图标改为 `🏝️ 台湾`，避免大陆 iPhone 无法显示台湾旗帜 Emoji；节点筛选和分流逻辑不变。
- 将“🌐 全部节点”重命名为“🌐 手动选择”；仅调整策略组显示名称，不改变节点筛选、默认出口或分流行为。
- 删除旧 Shadowrocket 配置及其专用检查逻辑；Routing 成为唯一 Shadowrocket 主路径。
- 清理 README、维护约定与统一检查中的旧版回退内容。
- Shadowrocket Routing 检查改为独立验证策略组、默认出口、节点筛选、规则引用与顺序，不再依赖任何旧配置基线。

## 2026-09-07 · v2.7.0

- 新增 `Shadowrocket_Routing.conf`：只维护 `include = WestData.conf`、策略组与分流规则。
- 节点、General / DNS / TUN、Host、Google Rewrite/MITM 等基础能力直接继承原始 WestData 配置，不在 Routing 配置中复制。
- Shadowrocket / Clash 双端一致性检查以 Routing 为基准；新增职责边界检查，防止基础参数进入轻量配置。
- WestData 私人本地检查验证节点命名、Host、Google Rewrite/MITM 等底座依赖，但不输出凭据。
- Clash 全部节点组补齐空组阻断；无 provider 且静态节点全部不符合命名时停止生成。
- Clash LAN 增加 `no-resolve`，避免前置局域网判断主动解析域名。
- YouTube 模块补齐 Worker 精确分流、安装与停用说明，以及模块结构检查。
- 增加 Mihomo 运行期空组与 LAN DNS 回归验证。
- 移除会导致原生 X App 刷新异常的 X 去广告方案；保留 X/Twitter 正常社交分流。

## 2026-09-06

- 恢复 Clash Verge Rev 扩展脚本与 Shadowrocket 并行维护，共用 Global.list。
- Clash 保留订阅 DNS、hosts、IPv6 和节点入口参数；统一两端 WestData 节点筛选。
- 补齐中国域名集，精简 AI 重复规则；npm 继续使用 GitHub 专项规则。
- 调整默认出口：AI 美国，Apple / Microsoft / FINAL 直连，其余业务跟随默认代理。
- 加入双端检查、私人 WestData 本地验证、当前树凭据扫描与 Mihomo 内核验证。
- 普通维护允许直接更新 main，不再强制 PR 或分支保护。

## 2026-09-04

- 建立 Shadowrocket 分流配置与远程 Global.list。
