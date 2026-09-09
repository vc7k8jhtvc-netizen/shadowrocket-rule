# Shadowrocket / Clash Verge Rev 分流配置

适用于 WestData 的个人分流配置。Shadowrocket 与 Clash 保持相同的业务分组与“中国大陆直连、其余未知流量默认代理”分流语义。

## Shadowrocket

### Shadowrocket Routing

Routing 负责**策略组与分流规则**，基础网络能力继续由原始 `WestData.conf` 提供。

1. 在 Shadowrocket 中保留并正常更新原始 `WestData.conf`。
2. 导入下列 Routing 配置并设为当前配置。
3. 确认 `[General]` 中的 `include = WestData.conf` 已建立包含关系。
4. 检查“🚀 默认代理”“🌍 国际兜底”和常用业务组，再按需检查底部地区节点池；确认“🛑 广告拦截”默认选择 `REJECT`。

[下载 Shadowrocket_Routing.conf](https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Shadowrocket_Routing.conf)

职责边界：

| 来源 | 负责内容 |
|---|---|
| WestData.conf | 节点、General / DNS / TUN、Host、URL Rewrite、MITM 及供应商基础设置 |
| Shadowrocket_Routing.conf | Proxy Group、Rule（含广告拦截与最终显式终结规则） |
| YouTube 模块 | YouTube 增强脚本及其专属规则 / MITM |

当前配置优先于被包含配置。v2.7.9 起，Shadowrocket 不再使用特殊 `FINAL` 作为最终兜底，而是在当前配置层加入显式全流量终结规则，目标是让所有剩余域名与纯 IP 流量在进入 WestData `[Rule]` 前即被“🌍 国际兜底”接管，同时继续继承 WestData 的 DNS、MITM、Host、Rewrite 与节点。

### v2.7.9 实机验证

该机制需要用 Shadowrocket 连接日志确认最终编译行为。重点测试：

| 域名 | WestData 原规则 | 本配置预期 |
|---|---|---|
| steampowered.com | DIRECT | 🌍 国际兜底 |
| wikipedia.org | PROXY | 🌍 国际兜底 |
| 任意未收录国外域名 | 可能无规则 | 🌍 国际兜底 |

如果上述域名仍显示命中 WestData 的 `DIRECT` / `PROXY`，说明跨 include 的规则编译优先级仍需进一步处理；在实机确认前不把“WestData Rule 0 参与”视为已验证事实。

### 广告拦截

正式配置使用 blackmatrix7 完整 Advertising 规则，内部版本为 `v2.7.9`。

- “🛑 广告拦截”默认 `REJECT`。
- 规则顺序：LAN → AI → Advertising → 其他业务 → 中国直连 → 显式国际兜底。
- 不新增 DNS、Rewrite、MITM 或脚本；这些继续继承 WestData。
- Clash 使用官方 `Advertising.yaml` 与 `Advertising_Domain.txt`。

## Clash Verge Rev

Clash 扩展脚本直接重建策略组、规则和规则提供器，因此 WestData 原有规则不会参与 Clash 分流；它继续保留订阅的 DNS、hosts、IPv6 及节点入口参数。

[下载 Clash_Verge_Rev_Script.js](https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Clash_Verge_Rev_Script.js)

## 代理分组顺序

1. 总控：🚀 默认代理、🌍 国际兜底、👆 手动选择
2. 业务：🤖 AI、🍎 Apple、🔎 Google、💻 GitHub、🪟 Microsoft、📱 社交媒体、▶️ YouTube、✈️ Telegram
3. 功能：🛑 广告拦截
4. 地区节点池：🇭🇰 香港、🏝️ 台湾、🇸🇬 新加坡、🇯🇵 日本、🇺🇸 美国

## 默认分流

| 策略组 | 初始出口 |
|---|---|
| 🚀 默认代理 | 🇭🇰 香港 |
| 🌍 国际兜底 | 🚀 默认代理 |
| 🤖 AI | 🇸🇬 新加坡 |
| 🍎 Apple、🪟 Microsoft | DIRECT |
| 🛑 广告拦截 | REJECT |
| 🔎 Google、💻 GitHub、📱 社交媒体、▶️ YouTube、✈️ Telegram | 🚀 默认代理 |

Shadowrocket 最终使用显式域名/IP终结规则；Clash 最终使用 `MATCH,🌍 国际兜底`。两端目标语义一致。

## 可选：YouTube 增强模块

仅适用于 Shadowrocket，依赖“▶️ YouTube”策略组。

[下载 YouTube.Enhance.Shadowrocket.sgmodule](https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/YouTube.Enhance.Shadowrocket.sgmodule)

## 维护文档

- [维护约定](EXPERIENCE.md)
- [变更记录](CHANGELOG.md)
- [安全说明](SECURITY.md)
