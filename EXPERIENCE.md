# 维护约定

安装、默认出口及日常排查见 [README](README.md)。

## 架构

Shadowrocket 以 `Shadowrocket_Routing.conf` 为唯一主配置：

- `WestData.conf`：节点、General / DNS / TUN、Host、URL Rewrite、MITM 与供应商基础设置；私人文件不得提交仓库。
- `Shadowrocket_Routing.conf`：仅 Proxy Group 与 Rule，不含通用广告策略组或 Advertising 黑名单。
- `Custom.list`：两端共用的个人显式自定义域名规则，由原 `Global.list` 恢复并更名。
- `YouTube.Enhance.Shadowrocket.sgmodule`：仅 YouTube 增强脚本、专属规则与两个专属 MITM 主机；不包含 CA 材料及通用 Advertising MITM 范围。
- Clash Verge Rev：保留订阅基础参数，通过扩展脚本重建策略组与规则，无通用广告 Providers。

## 修改范围

| 修改内容 | 维护要求 |
|---|---|
| 个人显式自定义域名 | 只修改 `Custom.list`；不得重新使用 `Global.list` 名称 |
| 未分类流量 | 不维护域名清单；由 🐟 漏网之鱼最终接管 |
| 国内明确应直连服务 | 若中国规则未覆盖且实机落入漏网之鱼，增加最小必要官方域名直连例外 |
| 专项规则、策略组、节点筛选或规则顺序 | 同步修改并检查 Shadowrocket Routing 与 Clash |
| 通用广告拦截 | 自 v2.7.18 移除；不得重新引入 Advertising 规则、策略组或第三方广告 MITM 主机；仅保留 YouTube 专项增强 |
| Shadowrocket 基础网络参数 | Routing 不复制，由被包含的 WestData.conf 负责 |

## 必须保留的行为

- Routing 的 `[General]` 只能保留 `include = WestData.conf`。
- DeepSeek 官方 `deepseek.com` 固定 DIRECT。
- “🧩 自定义”默认“🚀 默认代理”，候选为默认代理、美国、日本、新加坡；`Custom.list` 位于 Google 后、中国规则前。
- “🐟 漏网之鱼”默认“🚀 默认代理”，保留 DIRECT 与“👆 手动选择”。
- 分流顺序：LAN → DeepSeek → AI → Apple/Microsoft/GitHub/Telegram 等专项 → 社交媒体/YouTube/Google → Custom → China/China_Domain/GEOIP → 漏网之鱼。
- Shadowrocket 不使用 FINAL；末尾固定为 DOMAIN-WILDCARD、IPv4 和 IPv6 三条显式终结规则；Clash 最终使用 MATCH。
- 代理分组显示顺序：总控 → 业务（含自定义）→ 漏网之鱼 → 地区节点池，不得出现“🛑 广告拦截”。
- 两端节点筛选使用相同、区分大小写的 WestData 命名规则。
- Clash 保留订阅 DNS/hosts/IPv6/节点入口；LAN 使用 no-resolve，中国域名 Provider 使用 Clash `China_Domain.txt`，GEOIP,CN 不使用 no-resolve。
- YouTube 专属 UDP 拒绝规则仅匹配 googlevideo.com / youtubei.googleapis.com，MITM 主机仅为 `*.googlevideo.com`、`youtubei.googleapis.com`。

## 检查与发布

```bash
bash scripts/check-config.sh
```

需要本地订阅检查时：

```bash
WESTDATA_CONFIG=/path/to/WestData.conf bash scripts/check-config.sh
```

检查覆盖：Routing 仅包含 include/Proxy Group/Rule；Custom.list 语法、去重和双端引用；无旧 Global 与 Advertising 运行时配置回归；DeepSeek/Grok 双端一致；兜底完整；组名称、默认出口及顺序；YouTube 专属 MITM 最小范围与脚本固定版本；当前树敏感信息；版本一致；Clash 中国域名与 GEOIP 语义。CI 另用 Mihomo 核心验证合成配置及空节点组安全性。静态/CI 通过并不等于真实设备播放或误杀复测完成。

## v2.7.18 修正

- 删除 Shadowrocket / Clash 通用 Advertising 规则、Providers 和广告策略组。
- YouTube 模块移除第三方 Advertising MITM 主机，仅保留两个 YouTube 主机及原脚本/UDP 回退规则。
- 同步维护测试与文档；不修改 WestData.conf / Custom.list。

## v2.7.9 实机验证结论

此前已通过 Shadowrocket 日志验证，当前 Routing 的显式终结规则能够隔离 WestData 的旧规则。v2.7.15 恢复 Custom 后，该列表域名应优先命中“🧩 自定义”。本次修改仍需用户设备验证。

普通维护可直接更新 main；较大改动按需使用分支/PR。
