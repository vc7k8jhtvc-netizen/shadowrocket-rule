# Shadowrocket / Clash Verge Rev 分流配置

个人维护的 Shadowrocket 与 Clash Verge Rev 并行分流配置，共用个人 Global 规则集。

## 文件

- `Shadowrocket_Standalone_v2.6.5.conf`：当前 Shadowrocket 完整配置。
- `Clash_Verge_Rev_Script.js`：Clash Verge Rev 订阅扩展脚本。
- `Global.list`：两个客户端共用的个人 Global 规则集。
- `EXPERIENCE.md`：Shadowrocket 分流架构与维护原则。
- `CHANGELOG.md`：版本变更记录。
- `scripts/check-config.sh`：统一运行双端结构、敏感信息与行为检查。
- `scripts/check-shadowrocket.js`：Shadowrocket 结构、默认出口、规则顺序、Host 映射与 Global 规则检查。
- `scripts/check-clash-script.js`：Clash Verge Rev 脚本行为检查。
- `scripts/check-dual-client.js`：Shadowrocket 与 Clash Verge Rev 策略组及关键规则一致性检查。
- `scripts/check-sensitive-data.js`：当前 Git 树常见凭据格式启发式检查。
- `scripts/check-westdata-local.js`：私人 WestData 配置的本地只读兼容性检查。
- `SECURITY.md`：凭据暴露处置与仓库安全约束。

## 当前版本

- Shadowrocket：`v2.6.5`（唯一受支持的稳定配置路径）
- Clash Verge Rev：订阅扩展脚本 `Clash_Verge_Rev_Script.js`

新增功能、架构、策略组或规则优先级变化时，需要同步检查 Shadowrocket 与 Clash Verge Rev 两端；仅修改 `Global.list` 时两个客户端通过远程规则共同更新。

`Shadowrocket_Standalone_v2.6.5.conf` 当前同时承担稳定导入路径的职责：不破坏既有架构的规则修复、默认出口修正和兼容性回补可以保留原路径；DNS 架构、策略组结构、节点机制或其他不兼容变化应升级版本。

## 架构

配置采用以下分流顺序：

1. 局域网
2. AI、Apple、Microsoft、GitHub、Telegram、社交媒体、YouTube、Google等专项服务
3. 个人 Global 规则
4. 中国规则与中国 IP 直连
5. FINAL 兜底

规则按顺序匹配；Global 不应提前覆盖专项服务。

节点来源与分流逻辑分离：

- Shadowrocket：原始订阅负责提供和更新节点，主配置负责策略组、规则和 WestData 节点入口 Host 映射。其中启用 `use-local-host-item-for-proxy = true`。
- Clash Verge Rev：原始订阅负责节点、DNS、Host 与节点入口参数；扩展脚本仅重建策略组、规则和规则提供器，同时兼容 `proxies` 与 `proxy-providers`。
- 两端均不以订阅自带的策略组或规则作为本项目分流依据；Clash 保留订阅 DNS/Host，避免改写机场节点连接链路。
- Apple 服务由主规则与 Apple_Domain 域名规则共同覆盖。

## 使用前准备

- 准备有效的 WestData 节点订阅。
- 确认订阅能够在 Shadowrocket 中正常导入和更新节点。
- 不要公开分享或提交私人订阅地址。
- 当前配置按 WestData 的节点名称筛选香港、台湾、新加坡、日本和美国节点。更换服务商后可能需要修改筛选表达式。

## 私人 WestData 本地兼容性检查

仓库不保存私人订阅或生成后的私人配置。需要确认 WestData 当前节点命名和 Host 映射是否仍与本项目兼容时，在本地执行：

```bash
node scripts/check-westdata-local.js /path/to/private-westdata.conf
```

检查器只读取本地文件，只输出节点计数、地区匹配数量、被忽略的流量/到期提示条目数量、Host 映射命中数和 PASS/FAIL，不输出节点名称、服务器、密码、UUID 或订阅地址。私人输入文件不得提交到仓库。

## Shadowrocket 使用方法

### 1. 添加并更新节点订阅

先在 Shadowrocket 中正常添加 WestData 原始订阅并完成更新。订阅只负责提供节点，不使用其自带分流规则。

### 2. 导入主配置

主配置地址：

```text
https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Shadowrocket_Standalone_v2.6.5.conf
```

下载或导入后，将该文件设为当前使用的配置。

### 3. 检查地区节点组

打开策略组并确认以下分组中存在节点：

- 🇭🇰 香港
- 🇹🇼 台湾
- 🇸🇬 新加坡
- 🇯🇵 日本
- 🇺🇸 美国
- 🌐 全部节点

如果地区组为空，通常是订阅尚未更新，或者节点名称不符合当前 `policy-regex-filter`。

### 4. 选择业务策略

根据需要选择各业务组的出口：

- 🤖 AI：默认优先美国
- 🍎 Apple：默认直连
- 🌐 Google：默认使用“🚀 默认代理”
- 💻 GitHub：默认使用“🚀 默认代理”
- 🪟 Microsoft：默认直连
- 📱 社交：默认使用“🚀 默认代理”
- ▶️ YouTube：默认使用“🚀 默认代理”
- 📲 Telegram：默认使用“🚀 默认代理”
- 🌍 Global：默认使用“🚀 默认代理”
- 🐟 FINAL：默认直连

上述“默认”指新导入或未保存过选择时的初始排列顺序。客户端已保存的策略组选择通常不会被配置更新自动覆盖，仍可手动切换。

### 5. 验证分流

可用连接日志检查：

- `chatgpt.com` → 🤖 AI
- `gemini.google.com` → 🤖 AI
- `youtube.com` → ▶️ YouTube
- `github.com` → 💻 GitHub
- `wikipedia.org` → 🌍 Global
- `bytedance.com` → 直连
- 未匹配流量 → 🐟 FINAL

本配置不继承订阅中的规则、DNS、Rewrite 或 MITM；主配置包含 WestData 节点入口 Host 映射。

## Clash Verge Rev 使用方法

1. 在 Clash Verge Rev 中添加并确认机场订阅可正常更新。
2. 下载仓库中的订阅扩展脚本：

```text
https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Clash_Verge_Rev_Script.js
```


3. 将脚本作为该订阅的扩展脚本启用，然后更新订阅。
4. 检查地区组是否识别出节点。静态 `proxies` 中未识别出的地区会回退到“🌐 全部节点”；`proxy-providers` 的地区过滤为空时使用 `REJECT`，明确阻断而不静默直连。订阅完全没有节点或节点提供器时，脚本会直接报错。
5. 修改 `Global.list` 后只需更新远程规则，无需重新复制域名到脚本。

脚本会在 Clash Verge Rev 的脚本控制台输出执行开始、节点来源数量、各地区匹配数量、回退警告和完成摘要。为避免泄露订阅信息，日志不输出节点名称、节点参数或订阅地址。

脚本保留机场订阅的 DNS、Host 与节点入口参数，不启用或改写 Fake-IP、DoH、IPv6 和 Host 映射；仅接管分流策略。

## DNS 能力

- 保留 WestData 原版的 DNS 地址和系统绕过行为。
- 直连策略使用系统 DNS，不强制劫持53端口。
- 启用 `use-local-host-item-for-proxy = true`，使 `[Host]` 中的 WestData 备用域名映射用于代理连接。
- 允许局域网域名返回私有 IP。
- IPv6 和 IPv6 优先均关闭。

## 更新机制

| 更新内容 | 更新方式 |
|---|---|
| 节点订阅 | 由 Shadowrocket 的订阅更新机制处理 |
| Blackmatrix7 专项规则 | 由远程规则引用更新 |
| 个人 `Global.list` | 两端远程规则更新后生效 |
| 主配置版本 | 需要手动导入新版配置 |

主配置包含版本号，仓库发布新版本后不会自动覆盖本地文件。私人订阅地址仅保存在客户端中。

## Global 规则集

Shadowrocket 与 Clash Verge Rev 均通过远程 `RULE-SET` 读取：

```text
https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Global.list
```

个人 Global 域名统一维护在 `Global.list` 中。已被专项远程规则覆盖的域名不在此重复维护；例如 npm 使用上游 GitHub 规则的既有归类。

## 收录范围

收录：

- 没有独立策略组的国际服务
- 个人长期使用的网站
- 冷门但明确需要代理的工具或资料网站

不收录已有专项策略组的 AI、Apple、Google、GitHub、Microsoft、YouTube、Telegram 和社交媒体服务。

## 常见问题

### 节点存在，但地区组为空

节点名称与筛选表达式不匹配。检查实际节点名称，然后修改 Shadowrocket 的 `policy-regex-filter`。

### 节点可以使用，但网站进入错误策略

先查看连接日志中的命中规则。重点检查专项规则是否位于 Global、中国规则和 FINAL 之前。

### Global 新增规则没有立即生效

手动更新远程规则，或者等待客户端达到更新间隔。仍未生效时，检查 `Global.list` 原始地址能否访问。

### 能否直接使用原订阅的完整配置

可以单独使用服务商配置，但那会使用服务商的策略组、规则和 DNS。要使用本项目的分流逻辑，应在 Shadowrocket 中添加节点订阅，再导入本项目的主配置并设为当前配置。

## 维护规则

- 仅新增或删除 Global 域名：只修改 `Global.list`，不得在 Clash 脚本中复制。
- 修改专项服务规则、策略组、节点筛选或规则顺序：同步修改并检查 Shadowrocket 主配置与 Clash Verge Rev 脚本。
- DNS 架构、策略组结构、节点机制或其他不兼容变化：升级版本号，并同步更新 README 与 CHANGELOG；兼容性修复和默认出口修正可保留当前稳定配置路径，但仍必须记录 CHANGELOG。
- 不重新引入未经验证的大型 Global 规则或第三方规则镜像。
- 不将私人节点订阅地址提交到仓库。

## 安全与发布

- 私人订阅地址、节点凭据、UUID、密码、Token 与生成后的私人配置不得进入 Git。
- 普通维护允许直接更新 `main`；较大改动或需要审查时再按需使用分支/PR。发布前仍应运行 `bash scripts/check-config.sh`。
- `scripts/check-sensitive-data.js` 只扫描当前 Git 树并提供启发式拦截；若凭据曾经公开，仍必须在服务端撤销或轮换，历史重写不能替代凭据失效。
- 不强制为 `main` 启用 Ruleset/分支保护；是否使用 PR 和 GitHub 检查按改动风险决定。

## 更新检查

修改后至少运行 `bash scripts/check-config.sh`，并检查：

- 远程规则 URL 可以访问
- 规则引用的策略组名称完全一致
- 没有不必要的重复规则或前置覆盖
- Shadowrocket 与 Clash Verge Rev 均能正确读取 `Global.list`
- Clash Verge Rev 静态节点空地区回退“🌐 全部节点”，provider 空地区使用 `REJECT`；空订阅停止生成配置
- Clash Verge Rev 保留订阅 DNS/Host 与节点入口参数，不应出现脚本注入的 Host 或 DNS 覆盖
- Clash Verge Rev 同步使用 `China_Domain`，覆盖 Bilibili 等仅存在于中国域名集的国内服务
- 地区筛选能够匹配当前订阅的节点命名
- ChatGPT、Gemini、YouTube、GitHub、中国网站和未知域名命中预期策略
