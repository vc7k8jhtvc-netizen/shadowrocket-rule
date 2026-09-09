# 维护约定

安装、默认出口和日常排查见 [README](README.md)。

## 架构

Shadowrocket 以 `Shadowrocket_Routing.conf` 为唯一主路径：

- `WestData.conf`：节点、General / DNS / TUN、Host、URL Rewrite、MITM 与供应商基础设置。
- `Shadowrocket_Routing.conf`：仅 Proxy Group 与 Rule（含 Shadowrocket 广告拦截）；通过 `include = WestData.conf` 继承底座。
- YouTube Enhance：Shadowrocket 专属功能模块。
- Clash Verge Rev：保留订阅基础参数，扩展脚本重建策略组与规则。

## 修改范围

| 修改内容 | 维护要求 |
|---|---|
| 未分类国际服务域名 | 当前 Routing 的显式终结规则负责将剩余流量送入 🌍 国际兜底 |
| 国内明确应直连服务 | 若中国规则未覆盖且实机落入国际兜底，可增加最小官方域名直连例外；当前 DeepSeek 使用 `DOMAIN-SUFFIX,deepseek.com,DIRECT` |
| 专项规则、策略组、节点筛选或规则顺序 | 同步修改并检查 Shadowrocket Routing 与 Clash |
| 广告拦截规则 | 双端保持默认 REJECT 与规则优先级一致 |
| Shadowrocket 基础网络参数 | Routing 不复制；由被包含的 WestData.conf 负责 |

不重新镜像第三方完整规则库，不为普通国际站点维护大型手工域名补丁表。

## 必须保留的行为

- Routing 的 `[General]` 只能保留 `include = WestData.conf`。
- DeepSeek 官方 `deepseek.com` 域必须 DIRECT，并位于 ChatGPT / Gemini / Grok AI 代理规则之前。
- 分流顺序：LAN → 国内直连例外 → AI 专项例外 → Advertising → 其他专项服务 → China / China_Domain → GEOIP → 显式国际兜底。
- Shadowrocket 不使用 `FINAL`；末端固定为 `DOMAIN-WILDCARD,*`、IPv4 全网段、IPv6 全网段三条显式终结规则。
- Clash 最终使用 `MATCH,🌍 国际兜底`；两端最终分流语义一致。
- 代理分组显示顺序固定为：总控 → 业务 → 广告拦截 → 地区节点池。
- 两端节点筛选使用相同、区分大小写的 WestData 命名规则。

## 检查与发布

发布前运行：

```bash
bash scripts/check-config.sh
```

检查覆盖：

- DeepSeek DIRECT 双端一致；
- Routing 不存在 `FINAL`，且三条显式终结规则完整、顺序固定；
- 代理分组名称、默认出口与显示顺序；
- Advertising 主规则与默认 REJECT；
- Routing 配置、README 与当前 CHANGELOG 的版本一致性。

## v2.7.9 实机验证结论

已于 2026-09-09 通过 Shadowrocket 连接日志确认显式终结机制有效：域名流量命中 `DOMAIN-WILDCARD,*`，直接 IP 流量命中当前 Routing 的全网段 `IP-CIDR`；专项规则与 WestData MITM 基础能力继续正常。

普通维护可直接更新 `main`；较大改动按需使用分支/PR。
