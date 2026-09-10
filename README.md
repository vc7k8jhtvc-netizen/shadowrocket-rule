# Shadowrocket / Clash Verge Rev 分流配置

适用于 WestData 的个人分流配置。Shadowrocket 与 Clash 保持相同的业务分组与“中国大陆直连、其余未知流量默认代理”分流语义。

## Shadowrocket

### Shadowrocket Routing

新版只负责**策略组与分流规则**，基础网络能力由原始 `WestData.conf` 提供。

1. 在 Shadowrocket 中保留并正常更新原始 `WestData.conf`。
2. 导入下列 Routing 配置并设为当前配置。
3. 确认 `[General]` 中的 `include = WestData.conf` 已建立包含关系；若本地文件名不同，可在配置详情的“通用 → 包含配置”中手动选择原订阅。
4. 检查“🚀 默认代理”和常用业务组是否正常，再按需检查“🧩 自定义”“🐟 漏网之鱼”与底部地区节点池；确认“🛑 广告拦截”默认选择 `REJECT`。

Shadowrocket 的地区组依靠 `policy-regex-filter` 筛选节点，不提供自动回退到“👆 手动选择”的配置机制。若某个地区组没有可用节点，请直接使用“👆 手动选择”，并检查 WestData 节点是否符合“地区 | 节点”的命名格式；空组在客户端中的具体呈现以实际设备行为为准。

[下载 Shadowrocket_Routing.conf](https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Shadowrocket_Routing.conf)

职责边界：

| 来源 | 负责内容 |
|---|---|
| WestData.conf | 节点、General / DNS / TUN、Host、URL Rewrite、MITM 及供应商基础设置 |
| Shadowrocket_Routing.conf | Proxy Group、Rule（含广告拦截） |
| Custom.list | 个人显式自定义域名规则，Shadowrocket / Clash 共用 |
| YouTube 模块 | YouTube 增强脚本及其专属规则 / MITM |

包含配置中，当前配置优先于被包含配置。当前路由与广告拦截已完成实机试用；更新 WestData 或分流后仍建议从连接日志核对 AI、广告、YouTube、GitHub、自定义、中国直连与“🐟 漏网之鱼”的实际命中。

### 显式终结与 WestData Rule 隔离

v2.7.9 起，Shadowrocket 保留 `include = WestData.conf`，继续继承 WestData 的 DNS、MITM、Host、Rewrite、节点与其他基础能力；但不再使用特殊 `FINAL` 作为最终兜底。

当前 Routing 在中国规则之后加入：

```ini
DOMAIN-WILDCARD,*,🐟 漏网之鱼
IP-CIDR,0.0.0.0/0,🐟 漏网之鱼,no-resolve
IP-CIDR,::/0,🐟 漏网之鱼,no-resolve
```

目标是让所有剩余域名和直接 IP 流量在当前高优先级配置层即被“🐟 漏网之鱼”接管，不继续进入 WestData 的 `[Rule]`。

该机制已于 2026-09-09 通过 Shadowrocket 实机连接日志验证。v2.7.15 恢复自定义规则后，原自定义列表内的域名会先命中“🧩 自定义”，不再作为漏网测试样本；例如 `wikipedia.org` 当前应命中“🧩 自定义”，而 `steampowered.com` 仍可用于验证“🐟 漏网之鱼”。

### 国内 AI 直连

v2.7.10 起，DeepSeek 官方 `deepseek.com` 域固定直连：

```ini
DOMAIN-SUFFIX,deepseek.com,DIRECT
```

覆盖官网、`chat.deepseek.com` 与 `api.deepseek.com` 等官方子域，并置于 ChatGPT / Gemini / Grok 的代理规则之前。

### Grok / xAI

v2.7.14 补齐 Grok 当前功能域名。除已有的 `x.ai`、`grok.com` 外，增加 `grokusercontent.com`、`grok-sandbox.com`、`groktpcontent.com`、`grok.me`、`grokipedia.com` 与 `featureassets.org`。

### 自定义规则

v2.7.15 恢复原 `Global.list` 的完整规则内容，并重命名为 `Custom.list`；对应策略组由原“🌍 Global”改名为“🧩 自定义”。

[查看 Custom.list](https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Custom.list)

规则位置固定在 Google 之后、中国规则之前：

```text
Google
→ Custom.list → 🧩 自定义
→ China / China_Domain / GEOIP,CN
→ 🐟 漏网之鱼
```

因此 `Custom.list` 是**显式个人规则层**，而“🐟 漏网之鱼”仍是未被任何规则命中的最终兜底，两者职责不混用。“🧩 自定义”沿用旧 Global 的出口选择：默认“🚀 默认代理”，并提供美国、日本、新加坡。

### 漏网之鱼

v2.7.13 起，原兜底策略组重命名为“🐟 漏网之鱼”，只接收前面所有专项、自定义、中国规则都未命中的剩余流量。

“🐟 漏网之鱼”默认仍为“🚀 默认代理”，并保留 `DIRECT`、美国、日本、新加坡与“👆 手动选择”候选项。

### 广告拦截

正式配置已合并完整 Advertising 规则，内部版本为 `v2.7.15`。

- “🛑 广告拦截”默认 `REJECT`。
- 规则顺序：LAN → 国内 AI 直连 → AI 专项 → Advertising → 其他业务 → 自定义 → 中国直连 → 漏网之鱼。
- 不新增 DNS、Rewrite、MITM 或脚本；这些继续继承 WestData。

## Clash Verge Rev

Clash 扩展脚本同步维护同一“🧩 自定义”策略组，并通过 `Custom` rule-provider 读取仓库中的 `Custom.list`。最终兜底仍使用 `MATCH,🐟 漏网之鱼`，不会恢复旧 FINAL 架构。

[下载 Clash_Verge_Rev_Script.js](https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Clash_Verge_Rev_Script.js)

## 代理分组顺序

两端统一：

1. 总控：🚀 默认代理、👆 手动选择
2. 业务：🤖 AI、🍎 Apple、🔎 Google、💻 GitHub、🪟 Microsoft、📱 社交媒体、▶️ YouTube、✈️ Telegram、🧩 自定义
3. 功能：🛑 广告拦截、🐟 漏网之鱼
4. 地区节点池：🇭🇰 香港、🏝️ 台湾、🇸🇬 新加坡、🇯🇵 日本、🇺🇸 美国

## 默认分流

| 策略组 / 服务 | 初始出口 |
|---|---|
| 🚀 默认代理 | 🇭🇰 香港 |
| 🧩 自定义 | 🚀 默认代理 |
| 🐟 漏网之鱼 | 🚀 默认代理（可切换 DIRECT / 👆 手动选择） |
| DeepSeek | DIRECT |
| 🤖 AI（ChatGPT / Gemini / Grok） | 🇸🇬 新加坡 |
| 🍎 Apple、🪟 Microsoft | DIRECT |
| 🛑 广告拦截 | REJECT |
| 🔎 Google、💻 GitHub、📱 社交媒体、▶️ YouTube、✈️ Telegram | 🚀 默认代理 |

当前连接日志可重点核对：

| 域名 | 应命中的策略 |
|---|---|
| deepseek.com | DIRECT |
| chatgpt.com、gemini.google.com、grok.com | 🤖 AI |
| wikipedia.org、jable.tv、missav.ws | 🧩 自定义 |
| ad.doubleclick.net | 🛑 广告拦截 |
| youtube.com | ▶️ YouTube |
| github.com | 💻 GitHub |
| bytedance.com、bilibili.com | DIRECT |
| steampowered.com、其他未匹配域名 | 🐟 漏网之鱼 |

## 可选：YouTube 增强模块

**仅适用于 Shadowrocket**，依赖“▶️ YouTube”策略组。

[下载 YouTube.Enhance.Shadowrocket.sgmodule](https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/YouTube.Enhance.Shadowrocket.sgmodule)

## 维护文档

- [维护约定](EXPERIENCE.md)
- [变更记录](CHANGELOG.md)
- [安全说明](SECURITY.md)
