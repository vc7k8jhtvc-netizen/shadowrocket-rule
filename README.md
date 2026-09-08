# Shadowrocket / Clash Verge Rev 分流配置

适用于 WestData 的个人分流配置。Shadowrocket 与 Clash 共用 [Global.list](Global.list)，分别维护策略组与分流逻辑。

## Shadowrocket

### Shadowrocket Routing

新版只负责**策略组与分流规则**，基础网络能力由原始 `WestData.conf` 提供。

1. 在 Shadowrocket 中保留并正常更新原始 `WestData.conf`。
2. 导入下列 Routing 配置并设为当前配置。
3. 确认 `[General]` 中的 `include = WestData.conf` 已建立包含关系；若本地文件名不同，可在配置详情的“通用 → 包含配置”中手动选择原订阅。
4. 检查五个地区组及“👆 手动选择”是否正常取到 WestData 节点，并确认“🛑 广告拦截”默认选择 `REJECT`。

[下载 Shadowrocket_Routing.conf](https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Shadowrocket_Routing.conf)

职责边界：

| 来源 | 负责内容 |
|---|---|
| WestData.conf | 节点、General / DNS / TUN、Host、URL Rewrite、MITM 及供应商基础设置 |
| Shadowrocket_Routing.conf | Proxy Group、Rule（含广告拦截） |
| YouTube 模块 | YouTube 增强脚本及其专属规则 / MITM |

包含配置中，当前配置优先于被包含配置。当前路由与广告拦截已完成实机试用；更新 WestData 或分流后仍建议从连接日志核对 AI、广告、YouTube、GitHub、中国直连与 FINAL 的实际命中。

### 广告拦截

正式配置已合并经实机试用无异常的广告拦截规则，内部版本为 `v2.7.5`。

- “🛑 广告拦截”默认 `REJECT`；使用 [blackmatrix7 完整 Advertising](https://github.com/blackmatrix7/ios_rule_script/blob/master/rule/Shadowrocket/Advertising/README.md) 的 `Advertising.list` 和 `Advertising_Domain.list`，不叠加 Lite、Privacy 或 Hijacking。
- 规则顺序：LAN → AI 专项例外 → Advertising → 其他业务 → Global → 中国直连 → FINAL。广告规则优先于业务规则，以保持拦截效果。
- 不新增 DNS、Rewrite、MITM 或脚本。完整规则中的 HTTPS URL 正则只在相应域名已有 MITM 覆盖时生效。
- 选 `DIRECT` 或“🚀 默认代理”可用于排障；命中后会直接使用所选出口，不会继续匹配后续规则。
- 可从连接日志检查 `ad.doubleclick.net` 是否命中“🛑 广告拦截”；激励广告可能无法使用。
- 广告拦截已同步到 Clash 扩展脚本；Clash 使用官方 `Advertising.yaml` 与 `Advertising_Domain.txt`，Shadowrocket 的 14 条 URL-REGEX 由 Shadowrocket 规则端支持。

## Clash Verge Rev

1. 添加并更新 WestData 订阅。
2. 将下列文件设为该订阅的扩展脚本，启用后更新订阅。
3. 检查地区组；匹配异常可查看脚本控制台。

[下载 Clash_Verge_Rev_Script.js](https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Clash_Verge_Rev_Script.js)

脚本重建策略组、规则和规则提供器，保留订阅的 DNS、hosts、IPv6 及节点入口参数，支持 `proxies` 和 `proxy-providers`；广告拦截使用与 Shadowrocket 对应的完整 Advertising 规则集。

| 节点情况 | 处理方式 |
|---|---|
| 仅静态节点，某地区为空 | 该地区回退到“👆 手动选择” |
| 含 provider，地区组或全部节点组筛选为空 | 使用 REJECT 阻断 |
| 无节点来源，或无 provider 且没有符合命名的静态节点 | 停止生成并报错 |

## 默认分流

规则依次匹配：局域网 → AI 专项例外 → Advertising → 其他专项服务 → 个人 Global → 中国规则与中国 IP → FINAL。

| 策略组 | 初始出口 |
|---|---|
| 🚀 默认代理 | 🇭🇰 香港 |
| 🤖 AI（ChatGPT / Gemini / Grok） | 🇸🇬 新加坡 |
| 🍎 Apple、🪟 Microsoft、🐟 FINAL | DIRECT |
| 🛑 广告拦截 | REJECT |
| 🔎 Google、💻 GitHub、📱 社交媒体、▶️ YouTube、✈️ Telegram、🌍 Global | 🚀 默认代理 |

配置更新通常不会覆盖客户端已保存的选择。可从连接日志核对：

| 域名 | 应命中的策略 |
|---|---|
| chatgpt.com、gemini.google.com | 🤖 AI |
| ad.doubleclick.net | 🛑 广告拦截 |
| youtube.com | ▶️ YouTube |
| github.com | 💻 GitHub |
| wikipedia.org | 🌍 Global |
| bytedance.com、bilibili.com | DIRECT |
| 未匹配域名 | 🐟 FINAL |

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
| 专项规则、Global.list | 更新远程规则 |
| Clash 分流与广告拦截 | 替换脚本后更新订阅 |
| YouTube 模块 | 更新模块及脚本资源 |

地区组为空时先检查 WestData 节点命名；网站出口不对时检查已保存的策略选择与连接日志；Routing 的 DNS、Host、Rewrite 或 MITM 异常时优先检查被包含的 `WestData.conf`。

## 维护文档

- [维护约定](EXPERIENCE.md)
- [变更记录](CHANGELOG.md)
- [安全说明](SECURITY.md)
