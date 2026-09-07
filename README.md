# Shadowrocket / Clash Verge Rev 分流配置

适用于 WestData 的个人分流配置。两端共用 [Global.list](Global.list)，分别管理节点分组与分流规则。

## 开始使用

先在对应客户端添加 WestData 订阅，确认节点可正常更新。地区筛选按“英文地区名 + ` | ` + 节点名”区分大小写，支持香港、台湾、新加坡、日本和美国；更换服务商后可能需要调整。

### Shadowrocket

1. 添加并更新节点订阅。
2. 导入下列主配置，并设为当前配置。
3. 检查五个地区组及“🌐 全部节点”中是否有节点。

[下载 Shadowrocket_Standalone_v2.6.5.conf](https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Shadowrocket_Standalone_v2.6.5.conf)

订阅只提供节点。主配置管理规则、DNS 和 WestData 入口 Host 映射，不继承订阅的 Rewrite 或 MITM。直连使用系统 DNS，IPv6 关闭。

### Clash Verge Rev

1. 添加并更新节点订阅。
2. 将下列文件设为该订阅的扩展脚本，启用后更新订阅。
3. 检查地区组；匹配异常可查看脚本控制台。

[下载 Clash_Verge_Rev_Script.js](https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Clash_Verge_Rev_Script.js)

脚本重建策略组、规则和规则提供器，保留订阅的 DNS、hosts、IPv6 及节点入口参数，支持 `proxies` 和 `proxy-providers`。

| 节点情况 | 处理方式 |
|---|---|
| 仅静态节点，某地区为空 | 该地区回退到“🌐 全部节点” |
| 含 provider，地区组或全部节点组筛选为空 | 使用 REJECT 阻断 |
| 无节点来源，或无 provider 且没有符合命名的静态节点 | 停止生成并报错 |

## 默认分流

规则依次匹配：局域网 → 专项服务 → 个人 Global → 中国规则与中国 IP → FINAL。

| 策略组 | 初始出口 |
|---|---|
| 🚀 默认代理 | 🇭🇰 香港 |
| 🤖 AI（ChatGPT / Gemini / Grok） | 🇺🇸 美国 |
| 🍎 Apple、🪟 Microsoft、🐟 FINAL | DIRECT |
| 🌐 Google、💻 GitHub、📱 社交、▶️ YouTube、📲 Telegram、🌍 Global | 🚀 默认代理 |

配置更新通常不会覆盖客户端已保存的选择；需要时手动切换。可从连接日志核对：

| 域名 | 应命中的策略 |
|---|---|
| chatgpt.com、gemini.google.com | 🤖 AI |
| youtube.com | ▶️ YouTube |
| github.com | 💻 GitHub |
| wikipedia.org | 🌍 Global |
| bytedance.com、bilibili.com | DIRECT |
| 未匹配域名 | 🐟 FINAL |

## 可选：YouTube 增强模块

**仅适用于 Shadowrocket**，依赖主配置中的“▶️ YouTube”组。

[下载 YouTube.Enhance.Shadowrocket.sgmodule](https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/YouTube.Enhance.Shadowrocket.sgmodule)

1. 在模块管理中添加上述地址并启用。
2. 按客户端提示生成、安装并信任自己的 MITM 证书，启用 HTTPS 解密。
3. 更新脚本资源，测试普通视频、Shorts 和 YouTube Music；异常时先停用模块，确认普通分流是否恢复。

模块固定 Maasea 的脚本版本。部分播放请求会转到第三方 `init-stream.maasea.workers.dev`，传递脚本使用的客户端密钥参数与目标播放 URL；该精确域名跟随 YouTube 出口，Worker 不加入 MITM。停用模块也会停用这些规则和脚本。

脚本版本固定不代表 Worker 服务端固定。自动检查只验证结构与规则范围，去广告、画中画和后台播放仍需设备实测。

## 更新与排查

| 更新内容 | 操作 |
|---|---|
| 节点 | 更新客户端订阅 |
| 专项规则、Global.list | 更新远程规则 |
| Shadowrocket 主配置 | 重新下载或导入，确认设为当前配置 |
| Clash 扩展脚本 | 替换为最新脚本，再更新订阅 |
| YouTube 模块 | 更新模块及其脚本资源 |

地区组为空时，先检查订阅更新与节点命名；网站出口不对时，检查已保存的策略选择和连接日志中的命中规则；规则未生效时，检查更新状态及原始下载地址能否访问。

## 维护文档

- [维护约定](EXPERIENCE.md)：双端同步、DNS 边界、版本与检查命令。
- [变更记录](CHANGELOG.md)：关键版本结果。
- [安全说明](SECURITY.md)：私人配置与凭据处理。
