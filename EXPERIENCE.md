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
| 未分类国际服务域名 | 不再单独维护域名清单；当前 Routing 的显式终结规则负责将剩余流量送入 🌍 国际兜底 |
| 国内明确应直连服务 | 若中国规则未覆盖且实机落入国际兜底，仅增加最小官方域名直连例外；DeepSeek 使用 `DOMAIN-SUFFIX,deepseek.com,DIRECT` |
| 专项规则、策略组、节点筛选或规则顺序 | 同步修改并检查 Shadowrocket Routing 与 Clash |
| 广告拦截规则 | Shadowrocket 使用 `Advertising.list` 与 `Advertising_Domain.list`；Clash 使用 `Advertising.yaml` 与 `Advertising_Domain.txt`；两端保持默认 REJECT 与规则优先级一致 |
| Shadowrocket 基础网络参数 | Routing 不复制；由被包含的 WestData.conf 负责 |
| Shadowrocket Rewrite / MITM / Host | Routing 不维护；供应商基础功能由 WestData.conf 提供，额外增强继续模块化 |
| 兼容性修复或默认出口调整 | 记录 CHANGELOG，并保持 Routing 职责边界不变 |
| 新增主分流功能、策略组结构、显示顺序或规则优先级变化 | 升级 Routing 版本并同步双端检查 |

不重新镜像第三方完整规则库，不为普通国际站点维护大型手工域名补丁表。

## 必须保留的行为

- Routing 的 `[General]` 只能保留 `include = WestData.conf`，不得重新复制 DNS、TUN、Host、Rewrite、MITM 等基础设置。
- DeepSeek 官方 `deepseek.com` 域固定 DIRECT，并位于 ChatGPT / Gemini / Grok 的 AI 代理规则之前。
- “🌍 国际兜底”默认仍为“🚀 默认代理”，但必须保留“👆 手动选择”候选项，允许临时指定任意 WestData 节点。
- 分流顺序：LAN → 国内 AI 直连 → AI 专项例外 → Advertising → 其他专项服务 → China / China_Domain → GEOIP → 显式国际兜底。AI 在 Google 之前，字节跳动大陆直连规则在 TikTok 之前。
- Shadowrocket 不使用 `FINAL`；末端固定为 `DOMAIN-WILDCARD,*`、IPv4 全网段、IPv6 全网段三条显式终结规则，用于让 WestData `[Rule]` 不再承接剩余流量。
- Clash 最终使用 `MATCH,🌍 国际兜底`；两端最终分流语义一致，实现方式不同。
- 代理分组显示顺序固定为：总控 → 业务 → 广告拦截 → 地区节点池；地区节点池置底，避免挤占高频业务组。
- Apple 与中国服务均保留主规则和域名集两部分。
- 两端节点筛选使用相同、区分大小写的 WestData 命名规则。
- Shadowrocket Routing 与 Clash 的业务策略组、广告拦截主体和规则优先级应保持语义一致；Shadowrocket 的 URL-REGEX 细节由 Shadowrocket 客户端支持。
- Clash 保留订阅 DNS、hosts、IPv6 和节点入口参数；LAN 使用 `no-resolve`。
- Clash 继续整体重建策略组并继承节点/DNS 参数；暂不处理保留参数对原策略组的引用依赖。
- YouTube Worker 精确分流保留在模块内，使用“▶️ YouTube”出口，不扩展到整个 workers.dev。

## 检查与发布

发布前运行：

```bash
bash scripts/check-config.sh
```

检查覆盖：

- Routing 仅包含 include / Proxy Group / Rule；
- DeepSeek DIRECT 规则存在且位于 AI 代理规则与国际兜底之前；
- “🌍 国际兜底”默认出口为“🚀 默认代理”，并包含“👆 手动选择”；
- 代理分组名称、默认出口与显示顺序；
- Shadowrocket 不存在 `FINAL`，且三条显式终结规则完整、顺序固定；
- Advertising 主规则、域名集及其默认 REJECT 选择；
- Shadowrocket / Clash 关键行为一致性；
- 当前树敏感信息与 YouTube 模块结构；
- Routing 配置、README 与当前 CHANGELOG 的版本一致性。

修改节点命名或验证 WestData 底座时，用私人配置本地检查：

```bash
node scripts/check-westdata-local.js /path/to/private-westdata.conf
```

私人 WestData 配置不得提交。WestData 大改后，必须在设备上核对包含关系、总控与业务组、地区节点、AI / 广告 / YouTube / GitHub、中国直连与国际兜底，以及 Google Rewrite/MITM。

## v2.7.9 实机验证结论

已于 2026-09-09 通过 Shadowrocket 连接日志确认：

- `steampowered.com` / `steamstatic.com` 命中当前 Routing 的 `DOMAIN-WILDCARD,*`，没有落入 WestData DIRECT；
- `wikipedia.org` / `wikimedia.org` 命中当前 Routing 的 `DOMAIN-WILDCARD,*`，没有落入 WestData PROXY；
- `1.1.1.1` 及其他直接 IP 流量命中当前 Routing 的 `IP-CIDR` 全网段终结规则；
- AI、Google、GitHub、YouTube、Apple、中国直连与广告拦截等专项规则仍正常；
- MITM 日志仍正常出现，说明继承的 WestData 基础能力未因终结机制失效。

因此当前架构已验证达到：**WestData 提供基础能力，Routing 接管实际分流，WestData Rule 不再承担剩余流量。**

后续若调整 Shadowrocket 的 include、终结规则类型或规则顺序，必须重新执行上述冲突样本与纯 IP 回归验证；不得通过手工补域名掩盖架构回归。

普通维护可直接更新 `main`；较大改动按需使用分支/PR。
