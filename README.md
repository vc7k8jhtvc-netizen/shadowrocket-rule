# Shadowrocket / Clash Verge Rev 分流配置

适用于 WestData 的个人分流配置。Shadowrocket 与 Clash 保持相同的业务分组及“中国大陆直连、其余未知流量默认代理”语义。**内部版本为 `v2.7.18`。本版本移除通用 Advertising 黑名单，保留正常分流和可选的 YouTube 专项增强。**

## Shadowrocket

1. 保留并正常更新原始 `WestData.conf`。
2. [下载 Shadowrocket_Routing.conf](https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Shadowrocket_Routing.conf) 并设为当前配置。
3. 确认 `[General]` 中的 `include = WestData.conf` 有效；若本地文件名不同，在配置详情的“通用 → 包含配置”中手动选择原订阅。
4. 核对“🚀 默认代理”、业务组、“🧩 自定义”、地区节点池及“🐟 漏网之鱼”。

| 来源 | 职责 |
|---|---|
| WestData.conf | 节点、General / DNS / TUN、Host、URL Rewrite、MITM 与供应商基础能力；不要将私人订阅提交仓库 |
| Shadowrocket_Routing.conf | Proxy Group、Rule；**无 Advertising 规则或广告策略组** |
| Custom.list | 两端共用的个人显式分流规则 |
| YouTube.Enhance.Shadowrocket.sgmodule | 仅 YouTube 专属增强脚本/规则及专属 MITM 主机，不再包含通用广告 HTTPS MITM |
| Clash_Verge_Rev_Script.js | Clash Verge Rev 扩展脚本，重建策略组和分流，继承订阅 DNS/hosts |

当前 Routing 优先于被包含的配置。保留末尾三条显式终结规则，让剩余域名和纯 IP 流量优先归入“🐟 漏网之鱼”，避免进入 WestData 的旧 `[Rule]`；该机制在 2026-09-09 曾通过 Shadowrocket 实机日志验证。**本次 v2.7.18 仅做静态/CI 验证，尚未声称重新完成设备实测。**

## 广告拦截策略（v2.7.18）

由于通用 Advertising 规则存在误杀风险，正式分流已同时取消 Shadowrocket 的 `Advertising.list` / `Advertising_Domain.list` 以及 Clash 的 Advertising Providers、引用和“🛑 广告拦截”策略组。命中普通广告域名不再由本项目直接拒绝，而是继续进入后续业务、中国直连或兜底规则。不要简单将旧广告策略组改为 DIRECT：那会绕过正常分流。

**以前已经导入客户端的旧版配置与缓存不会被仓库自动删除。** 更新当前分流配置并清理旧广告模块；若客户端仍启用独立的第三方去广告模块或其他 DNS 广告屏蔽，需要在客户端另行停用。保留 YouTube 专项增强不等于保留通用广告黑名单；X 时间线推广内容没有独立过滤脚本。

## 业务分组与默认出口

| 策略组 / 服务 | 默认出口 |
|---|---|
| 🚀 默认代理 | 🇭🇰 香港 |
| 🤖 AI（ChatGPT / Gemini / Grok） | 🇸🇬 新加坡 |
| 🍎 Apple、🪟 Microsoft、DeepSeek | DIRECT |
| 🔎 Google、💻 GitHub、📱 社交媒体、▶️ YouTube、✈️ Telegram、🧩 自定义 | 🚀 默认代理 |
| 🐟 漏网之鱼 | 🚀 默认代理；可切换 DIRECT / 👆 手动选择等 |

地区节点池：香港、台湾、新加坡、日本、美国。Shadowrocket 用 `policy-regex-filter` 按“地区 | 节点”筛选；若某地区组为空，请手动选择节点并核对名称，客户端的空组呈现以设备行为为准。

### 显式终结与 Custom.list

`Custom.list` 恢复自原 Global.list，仍放在 Google 之后、中国规则之前；“🧩 自定义”默认使用“🚀 默认代理”。末尾固定：

```ini
DOMAIN-WILDCARD,*,🐟 漏网之鱼
IP-CIDR,0.0.0.0/0,🐟 漏网之鱼,no-resolve
IP-CIDR,::/0,🐟 漏网之鱼,no-resolve
```

不再使用特殊 `FINAL`；Clash 的对应终结规则为 `MATCH,🐟 漏网之鱼`。DeepSeek `deepseek.com` 固定直连，Grok/xAI 域名归入 AI，字节跳动 `bytedance.com` / `bytedance.net` 固定直连。

[查看 Custom.list](https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Custom.list)

## Clash Verge Rev

[下载 Clash_Verge_Rev_Script.js](https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Clash_Verge_Rev_Script.js)

Clash 扩展脚本与小火箭同步业务组、Custom 及中国直连语义。中国域名 provider 使用上游 Clash 专用 `China_Domain.txt`，`GEOIP,CN,DIRECT` 不带 `no-resolve`；保留原订阅 DNS、hosts、IPv6 及节点参数。旧 Advertising 规则与缓存需要由客户端按实际配置清理。

## 可选：仅 YouTube 增强（Shadowrocket）

[下载 YouTube.Enhance.Shadowrocket.sgmodule](https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/YouTube.Enhance.Shadowrocket.sgmodule)

提供 YouTube / YouTube Music 去广告、画中画与后台播放脚本。继续保留两个 YouTube UDP 拒绝规则，用于回退 TCP/TLS；它们不是全局广告黑名单。MITM 只追加 `*.googlevideo.com` 和 `youtubei.googleapis.com`。模块不携带证书或 CA 私钥，依赖设备已正确配置的 Shadowrocket MITM 证书。更新后请确认客户端没有并存旧版合并模块。

## 连接日志核验

| 样本 | 预期 |
|---|---|
| deepseek.com、bytedance.com | DIRECT |
| chatgpt.com、gemini.google.com、grok.com | 🤖 AI |
| wikipedia.org、jable.tv、missav.ws | 🧩 自定义 |
| youtube.com | ▶️ YouTube |
| github.com | 💻 GitHub |
| bilibili.com | DIRECT（依赖上游中国规则） |
| steampowered.com、其他未匹配域名 | 🐟 漏网之鱼 |

更新后还需在真实设备上对先前误杀的 App 进行复测；仓库静态检测无法替代运行时连接日志。

## 维护

- [维护约定](EXPERIENCE.md)
- [变更记录](CHANGELOG.md)
- [安全说明](SECURITY.md)

本地发布前运行 `bash scripts/check-config.sh`；私人订阅可使用 `WESTDATA_CONFIG=/path/to/WestData.conf bash scripts/check-config.sh` 单独校验，但不得提交到仓库。
