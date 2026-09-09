# Shadowrocket / Clash Verge Rev 分流配置

适用于 WestData 的个人分流配置。Shadowrocket 与 Clash 保持相同的业务分组与“中国大陆直连、其余未知流量默认代理”分流语义。

## Shadowrocket

### Shadowrocket Routing

新版只负责**策略组与分流规则**，基础网络能力由原始 `WestData.conf` 提供。

1. 在 Shadowrocket 中保留并正常更新原始 `WestData.conf`。
2. 导入下列 Routing 配置并设为当前配置。
3. 确认 `[General]` 中的 `include = WestData.conf` 已建立包含关系；若本地文件名不同，可在配置详情的“通用 → 包含配置”中手动选择原订阅。
4. 检查“🚀 默认代理”和常用业务组是否正常，再按需检查“🐟 漏网之鱼”与底部地区节点池；确认“🛑 广告拦截”默认选择 `REJECT`。

Shadowrocket 的地区组依靠 `policy-regex-filter` 筛选节点，不提供自动回退到“👆 手动选择”的配置机制。若某个地区组没有可用节点，请直接使用“👆 手动选择”，并检查 WestData 节点是否符合“地区 | 节点”的命名格式；空组在客户端中的具体呈现以实际设备行为为准。

[下载 Shadowrocket_Routing.conf](https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Shadowrocket_Routing.conf)

职责边界：

| 来源 | 负责内容 |
|---|---|
| WestData.conf | 节点、General / DNS / TUN、Host、URL Rewrite、MITM 及供应商基础设置 |
| Shadowrocket_Routing.conf | Proxy Group、Rule（含广告拦截） |
| YouTube 模块 | YouTube 增强脚本及其专属规则 / MITM |

包含配置中，当前配置优先于被包含配置。当前路由与广告拦截已完成实机试用；更新 WestData 或分流后仍建议从连接日志核对 AI、广告、YouTube、GitHub、中国直连与“🐟 漏网之鱼”的实际命中。

### 显式终结与 WestData Rule 隔离

v2.7.9 起，Shadowrocket 保留 `include = WestData.conf`，继续继承 WestData 的 DNS、MITM、Host、Rewrite、节点与其他基础能力；但不再使用特殊 `FINAL` 作为最终兜底。

当前 Routing 在中国规则之后加入：

```ini
DOMAIN-WILDCARD,*,🐟 漏网之鱼
IP-CIDR,0.0.0.0/0,🐟 漏网之鱼,no-resolve
IP-CIDR,::/0,🐟 漏网之鱼,no-resolve
```

目标是让所有剩余域名和直接 IP 流量在当前高优先级配置层即被“🐟 漏网之鱼”接管，不继续进入 WestData 的 `[Rule]`。

该机制已于 2026-09-09 通过 Shadowrocket 实机连接日志验证：

| 验证目标 | WestData 原行为 | 实机结果 |
|---|---|---|
| steampowered.com / steamstatic.com | DIRECT | 命中 `DOMAIN-WILDCARD,*`，进入漏网之鱼 |
| wikipedia.org / wikimedia.org | PROXY | 命中 `DOMAIN-WILDCARD,*`，进入漏网之鱼 |
| 1.1.1.1 与其他直接 IP | 可能继续进入 WestData IP 规则 | 命中当前 Routing 的 `IP-CIDR` 全网段终结规则 |

实机同时确认 AI、Google、GitHub、YouTube、Apple、中国直连与广告拦截等专项规则仍能正常命中，MITM 日志仍正常出现。因此当前架构已达到“继续继承 WestData 基础能力，但由 Routing 接管实际分流”的目标。

### 国内 AI 直连

v2.7.10 起，DeepSeek 官方 `deepseek.com` 域固定直连：

```ini
DOMAIN-SUFFIX,deepseek.com,DIRECT
```

覆盖官网、`chat.deepseek.com` 与 `api.deepseek.com` 等官方子域，并置于 ChatGPT / Gemini / Grok 的代理规则之前。

### 漏网之鱼

v2.7.13 起，原“🌍 国际兜底”重命名为“🐟 漏网之鱼”，并从顶部总控区移动到“🛑 广告拦截”之后，更直观地表达其职责：只接收前面所有专项、中国规则都未命中的剩余流量。

“🐟 漏网之鱼”默认仍为“🚀 默认代理”，并保留 `DIRECT`、美国、日本、新加坡与“👆 手动选择”候选项。

### 广告拦截

正式配置已合并经实机试用无异常的广告拦截规则，内部版本为 `v2.7.13`。

- “🛑 广告拦截”默认 `REJECT`；使用 [blackmatrix7 完整 Advertising](https://github.com/blackmatrix7/ios_rule_script/blob/master/rule/Shadowrocket/Advertising/README.md) 的 `Advertising.list` 和 `Advertising_Domain.list`，不叠加 Lite、Privacy 或 Hijacking。
- 规则顺序：LAN → 国内 AI 直连 → AI 专项例外 → Advertising → 其他业务 → 中国直连 → 漏网之鱼。未知非中国流量无需手工补域名。广告规则优先于业务规则，以保持拦截效果。
- 不新增 DNS、Rewrite、MITM 或脚本。完整规则中的 HTTPS URL 正则只在相应域名已有 MITM 覆盖时生效。
- 选 `DIRECT` 或“🚀 默认代理”可用于排障；命中后会直接使用所选出口，不会继续匹配后续规则。
- 可从连接日志检查 `ad.doubleclick.net` 是否命中“🛑 广告拦截”；激励广告可能无法使用。
- 广告拦截已同步到 Clash 扩展脚本；Clash 使用官方 `Advertising.yaml` 与 `Advertising_Domain.txt`，Shadowrocket 的 14 条 URL-REGEX 由 Shadowrocket 规则端支持。

## Clash Verge Rev

1. 添加并更新 WestData 订阅。
2. 将下列文件设为该订阅的扩展脚本，启用后更新订阅。
3. 检查总控和业务组；匹配异常可查看脚本控制台。

[下载 Clash_Verge_Rev_Script.js](https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Clash_Verge_Rev_Script.js)

脚本重建策略组、规则和规则提供器，保留订阅的 DNS、hosts、IPv6 及节点入口参数，支持 `proxies` 和 `proxy-providers`；广告拦截使用与 Shadowrocket 对应的完整 Advertising 规则集。

| 节点情况 | 处理方式 |
|---|---|
| 仅静态节点，某地区为空 | 该地区回退到“👆 手动选择” |
| 含 provider，地区组或全部节点组筛选为空 | 使用 REJECT 阻断 |
| 无节点来源，或无 provider 且没有符合命名的静态节点 | 停止生成并报错 |

## 代理分组顺序

两端统一按使用频率与语义层级展示：

1. 总控：🚀 默认代理、👆 手动选择
2. 业务：🤖 AI、🍎 Apple、🔎 Google、💻 GitHub、🪟 Microsoft、📱 社交媒体、▶️ YouTube、✈️ Telegram
3. 功能：🛑 广告拦截、🐟 漏网之鱼
4. 地区节点池：🇭🇰 香港、🏝️ 台湾、🇸🇬 新加坡、🇯🇵 日本、🇺🇸 美国

## 默认分流

Shadowrocket 依次匹配：局域网 → 国内 AI 直连 → AI 专项例外 → Advertising → 其他专项服务 → 中国规则与中国 IP → 漏网之鱼。Clash 使用同等业务顺序，并最终以 `MATCH,🐟 漏网之鱼` 收口。

| 策略组 / 服务 | 初始出口 |
|---|---|
| 🚀 默认代理 | 🇭🇰 香港 |
| 🐟 漏网之鱼 | 🚀 默认代理（可切换 DIRECT / 👆 手动选择） |
| DeepSeek | DIRECT |
| 🤖 AI（ChatGPT / Gemini / Grok） | 🇸🇬 新加坡 |
| 🍎 Apple、🪟 Microsoft | DIRECT |
| 🛑 广告拦截 | REJECT |
| 🔎 Google、💻 GitHub、📱 社交媒体、▶️ YouTube、✈️ Telegram | 🚀 默认代理 |

配置更新通常不会覆盖客户端已保存的选择。可从连接日志核对：

| 域名 | 应命中的策略 |
|---|---|
| deepseek.com、chat.deepseek.com、api.deepseek.com | DIRECT |
| chatgpt.com、gemini.google.com | 🤖 AI |
| ad.doubleclick.net | 🛑 广告拦截 |
| youtube.com | ▶️ YouTube |
| github.com | 💻 GitHub |
| wikipedia.org、steampowered.com | 🐟 漏网之鱼 |
| bytedance.com、bilibili.com | DIRECT |
| 未匹配域名 | 🐟 漏网之鱼 |

## 可选：YouTube 增强模块

**仅适用于 Shadowrocket**，依赖“▶️ YouTube”策略组。

[下载 YouTube.Enhance.Shadowrocket.sgmodule](https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/YouTube.Enhance.Shadowrocket.sgmodule)

1. 在模块管理中添加并启用。
2. 确保当前配置的 HTTPS 解密证书已安装并信任。
3. 更新脚本资源后测试普通视频、Shorts 和 YouTube Music。

模块固定 Maasea 的脚本版本。部分播放请求会转到第三方 `init-stream.maasea.workers.dev`；该精确域名跟随 YouTube 出口，Worker 不加入 MITM。自动检查只验证结构与规则范围，播放增强仍需设备实测。

## 更新与排查

| 更新内容 | 操作 |
|---|---|
| WestData 节点 / 基础配置 | 更新原始 `WestData.conf` |
| Shadowrocket 分流与广告拦截 | 更新 `Shadowrocket_Routing.conf` |
| 第三方专项规则 | 由远程规则源更新 |
| Clash 分流与广告拦截 | 替换脚本后更新订阅 |
| YouTube 模块 | 更新模块及脚本资源 |

地区组为空时先检查 WestData 节点命名；网站出口不对时检查已保存的策略选择与连接日志；Routing 的 DNS、Host、Rewrite 或 MITM 异常时优先检查被包含的 `WestData.conf`。

## 维护文档

- [维护约定](EXPERIENCE.md)
- [变更记录](CHANGELOG.md)
- [安全说明](SECURITY.md)
