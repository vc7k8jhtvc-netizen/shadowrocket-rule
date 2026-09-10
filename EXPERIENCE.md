# 维护约定

安装、默认出口和日常排查见 [README](README.md)。

## 架构

Shadowrocket 以 `Shadowrocket_Routing.conf` 为唯一主路径：

- `WestData.conf`：节点、General / DNS / TUN、Host、URL Rewrite、MITM 与供应商基础设置。
- `Shadowrocket_Routing.conf`：Proxy Group 与 Rule。
- `Custom.list`：个人显式自定义域名规则，Shadowrocket / Clash 共用；由原 `Global.list` 恢复并更名。
- YouTube Enhance：Shadowrocket 专属功能模块。
- Clash Verge Rev：保留订阅基础参数，扩展脚本重建策略组与规则。

## 修改范围

| 修改内容 | 维护要求 |
|---|---|
| 个人显式自定义域名 | 只修改 `Custom.list`，两端远程共用；不得重新使用 `Global.list` 名称 |
| 未分类流量 | 不维护域名清单；由 🐟 漏网之鱼最终接管 |
| 国内明确应直连服务 | 若中国规则未覆盖且实机落入漏网之鱼，可增加最小官方域名直连例外 |
| 专项规则、策略组、节点筛选或规则顺序 | 同步修改并检查 Shadowrocket Routing 与 Clash |
| 广告拦截规则 | 两端保持默认 REJECT 与规则优先级一致 |
| Shadowrocket 基础网络参数 | Routing 不复制；由被包含的 WestData.conf 负责 |

## 必须保留的行为

- Routing 的 `[General]` 只能保留 `include = WestData.conf`。
- DeepSeek 官方 `deepseek.com` 域固定 DIRECT。
- “🧩 自定义”默认“🚀 默认代理”，出口候选保持旧 Global 语义：默认代理、美国、日本、新加坡。
- `Custom.list` 规则固定在 Google 之后、中国规则之前。
- “🐟 漏网之鱼”默认“🚀 默认代理”，并保留 `DIRECT` 与“👆 手动选择”。
- 分流顺序：LAN → 国内 AI 直连 → AI → Advertising → 其他专项服务 → Custom → China / China_Domain → GEOIP → 漏网之鱼。
- Shadowrocket 不使用 `FINAL`；末端固定为 `DOMAIN-WILDCARD,*`、IPv4 全网段、IPv6 全网段三条显式终结规则。
- Clash 最终使用 `MATCH,🐟 漏网之鱼`。
- 代理分组显示顺序固定为：总控 → 业务（含自定义）→ 广告拦截 → 漏网之鱼 → 地区节点池。
- 两端节点筛选使用相同、区分大小写的 WestData 命名规则。
- Clash 保留订阅 DNS、hosts、IPv6 和节点入口参数；LAN 使用 `no-resolve`。

## 检查与发布

发布前运行：

```bash
bash scripts/check-config.sh
```

私有 `WestData.conf` 不提交仓库；需要检查本地实际订阅时，显式传入文件路径：

```bash
WESTDATA_CONFIG=/path/to/WestData.conf bash scripts/check-config.sh
```

检查覆盖：

- Routing 仅包含 include / Proxy Group / Rule；
- `Custom.list` 存在、语法有效、无重复，并被两端正确引用；
- 不存在运行时 `Global.list` / “🌍 Global” 回归；
- DeepSeek 与 Grok 规则双端一致；
- “🐟 漏网之鱼”终结规则完整；
- 代理分组名称、默认出口与显示顺序；
- Advertising 默认 REJECT；
- 当前树敏感信息；
- Routing 配置、README 与当前 CHANGELOG 的版本一致性。
- 若设置 `WESTDATA_CONFIG`，额外检查本地私有订阅的兼容性。

## v2.7.9 实机验证结论

已验证 Shadowrocket 当前配置能够在保留 WestData 基础能力的同时，用当前 Routing 的显式终结规则接管剩余域名与直接 IP 流量。v2.7.15 恢复 `Custom.list` 后，列表内域名应优先命中“🧩 自定义”；未列入 Custom 的样本继续用于漏网回归。

普通维护可直接更新 `main`；较大改动按需使用分支/PR。
