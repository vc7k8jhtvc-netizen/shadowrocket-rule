# 版本变更记录

## 全量审计加固 — 2026-09-06

- 新增 Shadowrocket 结构回归检查，覆盖 17 个策略组、全部既定默认出口、节点筛选、策略引用、关键规则顺序、Global 语法/重复项及三条 WestData Host 映射。
- 新增 Shadowrocket 与 Clash Verge Rev 双端一致性检查，自动比对业务策略组选项、AI 手工规则、ByteDance 直连特例和关键规则层级。
- 新增当前 Git 树敏感信息启发式扫描，拦截常见代理 URI、私钥、认证头、Token、UUID 与凭据赋值；测试占位值显式放行。
- 新增 `scripts/check-westdata-local.js`，本地只读验证私人 WestData 配置的节点命名和 Host 映射，只输出计数及 PASS/FAIL，不打印节点参数。
- 新增 `.gitignore` 与 `SECURITY.md`，阻止常见私人生成配置误提交，并明确凭据泄露必须优先撤销/轮换。
- 所有新增自动检查接入 `scripts/check-config.sh`；私人 WestData 检查器在 CI 中只做语法检查，不读取或保存私人订阅。
- GitHub Actions 的 checkout 从已弃用 Node.js 20 运行时的 v4 升级到 v7.0.1，并固定到提交 SHA，降低未来运行时和供应链漂移风险。
- 明确 `v2.6.5` 当前兼作稳定导入路径：兼容性修复可回补原路径，不兼容架构变化必须升级版本。
- 明确 `main` 应启用 Ruleset/分支保护并要求 `Check configuration` 通过；仓库管理设置需在 GitHub 侧单独启用。

## Clash DNS/Host 正式修复 — 2026-09-06

- 正式脚本改为保留机场订阅的 DNS、hosts、IPv6 与节点入口参数，只接管策略组、分流规则和规则提供器。
- 移除 WestData Host 映射、Fake-IP、DoH 与 DNS 策略的脚本注入，避免改写节点连接解析链路导致远端强制断开。
- 回归测试覆盖 DNS/hosts/IPv6 不被覆盖，以及无 DNS 配置订阅也能正常生成。
- 删除已被正式脚本替代的 `Clash_Verge_Rev_Script_v2.6.6-test.js`。


## Clash DNS/Host 保留测试版 — 2026-09-06

- 新增 `Clash_Verge_Rev_Script_v2.6.6-test.js`。
- 保留订阅原有 DNS、hosts 和节点入口参数，仅接管分流策略。
- 用于确认 WestData 节点入口断开是否由 Clash 的 DNS/Host 接管引起。


## 修复 Clash 中国域名分流 — 2026-09-06

- 补回与 Shadowrocket 等价的 `China_Domain` 规则提供器。
- 将 `China_Domain` 放在 `China` 与 `GEOIP,CN` 之间。
- 为 `China_Domain` 增加国内 DoH DNS 策略。
- 增加 Bilibili 类中国域名规则提供器与规则顺序回归测试。


## 稳定性收口 — 2026-09-06

- Clash provider 地区组为空时使用 `REJECT`，不再使用等同直连的 `COMPATIBLE`。
- provider 地区过滤保留忽略大小写语义，并新增五个地区组的回归断言。
- 测试配置使用完整的 Shadowsocks 测试节点参数，可输出供内核检查的配置。
- GitHub Actions 固定使用 Mihomo v1.19.30 对脚本生成结果执行内核级配置解析。
- README、架构经验文档与 Global 规则说明同步更新。


## Clash Verge Rev 控制台输出 — 2026-09-06

- 增加带统一前缀的脚本控制台输出：执行开始、节点来源统计、地区匹配统计、空地区回退警告和完成摘要。
- 空订阅拒绝同时写入错误日志。
- 日志不输出节点名称、节点参数或订阅地址。
- 扩展行为测试覆盖正常、警告、错误输出及敏感节点名不泄露。


## 恢复 Clash Verge Rev 并行维护 — 2026-09-06

- 新增 `Clash_Verge_Rev_Script.js`，以订阅扩展脚本形式与 Shadowrocket v2.6.5 并行维护。
- 地区节点池为空时回退“🌐 全部节点”而非 `DIRECT`；订阅无节点时直接报错，避免静默直连。
- 同时兼容 `proxies` 与 `proxy-providers`，扩展中英文及旗帜节点名称匹配。
- 接管 Mihomo DNS、Host 映射和选择持久化，并恢复 Apple 主规则与 Apple_Domain 双重覆盖。
- Clash Verge Rev 通过远程规则提供器读取共用 `Global.list`，不再维护域名副本。
- 新增脚本行为测试，并将双端一致性检查纳入 `scripts/check-config.sh`。


## 默认出口调整 — 2026-09-06

- AI 默认美国；Apple、Microsoft 与 FINAL 默认直连。
- Google、GitHub、社交、YouTube、Telegram 与 Global 默认使用“🚀 默认代理”。
- 此调整回补至既有 v2.6.5 配置路径；已保存的客户端策略组选择需手动切换或重新导入。

## 配置收敛 — 2026-09-06

- 保留 Shadowrocket_Standalone_v2.6.5.conf 作为唯一主配置。
- 删除 Shadowrocket_Standalone_v2.6.6.conf 与 Shadowrocket_Standalone_v2.6.7.conf。

## 中国规则修复 — 2026-09-06

- 向当前受支持的 Shadowrocket v2.6.5 回补缺失的 `China_Domain.list`，通过 `DOMAIN-SET` 引用并使用 `DIRECT`。
- 中国规则按 `China.list` → `China_Domain.list` → `GEOIP,CN` 排列，保留前面的专项服务和个人 Global 规则优先级。
- 此修复保留既有 v2.6.5 导入地址，方便现有配置地址获取修复。

## 可验证性与规则归属 — 2026-09-06

- 新增本地静态检查，验证主配置结构、规则顺序、默认出口和 README 导入地址。
- `npmjs.com` 与 `npmjs.org` 由上游 GitHub 规则归类，已从个人 Global 规则集中移除重复条目。

## 维护更新 — 2026-09-06

- 移除 Mihomo/Clash Meta 支持，删除 `Clash_Meta_Standalone_v2.6.5.yaml`。
- 清理 README 与架构文档中的使用说明、DNS 配置说明和双平台同步维护要求，改为仅维护 Shadowrocket。
- 更新 `Global.list` 的用途注释，规则内容不变。
- 保留现有 Shadowrocket 配置文件及其版本号。
- 下方涉及 Mihomo/Clash Meta 的内容为历史版本记录，不代表当前支持范围。

## v2.6.5 — 2026-09-05

### 双端

- 修复 v2.6.4 仅保留 Shadowrocket `[Host]` 映射、但未启用 `use-local-host-item-for-proxy` 的遗漏。
- 恢复 Shadowrocket 与 WestData 原版兼容的系统绕过、DNS、直连解析和 UDP 策略参数。
- 移除 Shadowrocket 独立配置中此前排查阶段的强制 DoH、DNS 劫持和直连失败转代理设置。
- 两端主配置同步升级至 v2.6.5；旧 v2.6.4 主配置文件删除。

### 验证

- 复核已验证可用的 Host 版本：`use-local-host-item-for-proxy = true` 与三条 WestData 入口映射同时存在。
- Mihomo 保留顶层 `hosts` 与 `dns.use-hosts: true`，继续使用等价的节点入口映射。

## v2.6.4 — 2026-09-05

### 双端

- 修正 Mihomo 漏引 Apple_Domain 规则集的问题。
- 新增 `Apple_Domain` 远程规则提供器，并在 `Apple` 规则后引用，补齐与 Shadowrocket 相同的 Apple 域名覆盖。
- 两端主配置同步升级至 v2.6.4；旧 v2.6.3 主配置文件删除。
- 修正架构经验文档中关于 Shadowrocket Host 映射的表述。

### 验证

- 确认 Shadowrocket 与 Mihomo 的 Apple 规则均包含主规则和域名规则两部分。
- 确认 Apple_Domain 使用 Mihomo `behavior: domain` 与文本格式读取。

## v2.6.3 — 2026-09-05

### 双端

- 撤回排查阶段对 Shadowrocket 通用参数和 X 显式规则的临时修改，恢复 v2.6.0 原有行为。
- 仅保留已验证有效的 WestData 节点入口映射。
- Shadowrocket 使用 [Host]；Mihomo 使用顶层 hosts，并显式启用 dns.use-hosts。

### 验证

- 同一 iPhone、同一机场节点和 5G 网络下，补回 Host 映射后访问恢复正常。
- 因此确认阻断原因是节点入口 Host 映射缺失，而不是嵌套策略组、DNS参数或规则本身。


## v2.6.2 — 2026-09-05

### Shadowrocket

- 修复自定义配置漏掉 WestData 原版 [Host] 映射导致的蜂窝网络访问异常。
- 为三个节点入口域名补充备用域名映射，保持与机场原版一致。
- 保留原版兼容的 General、节点更新和 DNS 设置。

### Mihomo/Clash Meta

- 新增与 Shadowrocket 等价的顶层 hosts 域名映射。
- 显式启用 dns.use-hosts，确保节点域名解析使用备用映射。
- 双端同步升级至 v2.6.2。

### 验证

- 在同一 iPhone、同一机场节点和 5G 网络下，未含 Host 映射的自定义配置仍阻断；补回映射后恢复正常。
- 该结果确认问题不是嵌套策略组、DNS 强制接管或节点凭据本身。


## v2.6.1 — 2026-09-05

### Shadowrocket

- 修复 v2.6.0 强制 DNS 接管导致部分网络下 HTTPS 建连失败的问题。
- 恢复与 WestData 原始订阅兼容的系统绕过、保留地址排除路由及国内 DNS 设置。
- 恢复直连系统 DNS，并关闭直连 DNS 失败时自动转代理。
- 节点服务器域名允许使用本地主机映射结果。
- 明确补充 X、Twitter、Twimg 与 t.co 规则，统一交给“📱 社交”策略。

### Mihomo/Clash Meta

- 同步补充 X、Twitter、Twimg 与 t.co 显式规则。
- 与 Shadowrocket 同步升级版本号。

### 验证依据

- 同一网络和同一机场节点下，服务商原版配置可正常访问，新版 v2.6.0 出现 HTTPS 失败，故将问题定位到 Shadowrocket 通用网络与 DNS 参数差异。
- DNS日志能够返回正常 A 记录，连接日志未命中拒绝规则，因此不属于普通 DNS 解析失败或规则主动拦截。


## v2.6.0 — 2026-09-05

### Shadowrocket

- 新增 `[General]` DNS配置，由主配置统一管理解析行为。
- 使用阿里与腾讯 DoH 作为主要解析器。
- 主要解析失败时，通过代理访问 Cloudflare 与 Google DoH。
- 启用53端口 DNS劫持、私有 IP响应和直连解析失败代理回退。
- 禁止回退系统 DNS。
- 关闭 IPv6及 IPv6优先。

### Mihomo/Clash Meta

- 中国规则中的域名使用阿里与腾讯 DoH。
- 其他域名通过“🚀 默认代理”访问 Cloudflare 与 Google DoH。
- 节点服务器域名及直连域名继续使用国内 DoH。
- 启用 DNS规则遵循和 ARC缓存。
- 保持 Fake-IP 模式及 IPv6关闭。

### 共用架构

- 两端主配置同步升级至 v2.6.0。
- README 与架构文档补充 DNS能力和维护原则。
- 私人节点订阅地址仍不写入公开仓库。

## v2.5.1 — 2026-09-05

### Shadowrocket

- 补充 `Global.list` 中已有服务的关联域名：
  - npm：`npmjs.org`
  - Hugging Face：`hf.co`
  - Notion：`notion.site`、`notionusercontent.com`
  - Dropbox：`dropboxapi.com`、`dropboxusercontent.com`
  - Slack：`slack-edge.com`、`slack-imgs.com`
  - Atlassian：`atlassian.net`
- 将 `gemini.google.com` 和 `generativelanguage.googleapis.com` 从 `DOMAIN-SUFFIX` 改为精确的 `DOMAIN` 匹配。
- 两个平台统一到 v2.5.1 后，删除已落后的 `Shadowrocket_Standalone_v2.5.conf`。

### Mihomo/Clash Meta

- 新增完整 Mihomo 配置，通过 `proxy-providers.WestData.url` 填写节点订阅地址。
- 将 Shadowrocket 的策略结构转换为17个等价的 Mihomo 策略组。
- 新增12个传统规则提供器：11个来自 Blackmatrix7 的 YAML 规则提供器，以及1个读取共用 `Global.list` 的文本规则提供器。
- 新增 DNS、节点提供器健康检查和策略选择持久化。
- 收紧地区筛选表达式，避免两个字母的缩写产生错误匹配。
- 将 Mihomo 文件名及内部版本号与 Shadowrocket 统一为 v2.5.1。
- 删除已落后的 `Clash_Meta_Standalone_v1.0.yaml`。

### 共用架构

- 两个平台共同读取同一份 `Global.list`，删除临时生成的重复文件 `Global.yaml`。
- 明确双平台同步维护要求。
- 明确私人订阅地址只能保存在本地，不得提交到公开仓库。
- 继续使用 Blackmatrix7 的远程规则源，不重新建立本地镜像。

### 验证

- 已确认 Mihomo YAML 可以解析，策略组和规则提供器不存在悬空引用。
- 已确认测试订阅能返回有效的 `proxies` 节点列表，并能匹配所有已配置地区。
- 当前环境没有 Mihomo 内核，因此未执行内核级配置测试。

## v2.5 — 2026-09-04

- 新增最初的 Shadowrocket 独立配置。
- 根据2026年9月4日核对的网络允许列表，补全 OpenAI/ChatGPT 分流。
- 将个人 Global 规则迁移到 GitHub 维护的 `Global.list`。
- 删除重复的 Gemini 精确匹配规则。
