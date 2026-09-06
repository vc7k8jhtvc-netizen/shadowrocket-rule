# Shadowrocket / Clash Verge Rev 分流架构经验总结

## 1. 架构目标

目标不是制作大而全的规则库，而是建立长期稳定、低维护的 Shadowrocket 与 Clash Verge Rev 双端个人分流系统。

核心原则：

- 节点来源与分流逻辑分离。
- Shadowrocket 主配置与 Clash Verge Rev 订阅扩展脚本分别管理专项规则、策略组和优先级。
- 新增功能、架构或规则优先级变化时升级版本号；已发布配置的修复或默认出口调整保留原路径，并同步更新 README 与 CHANGELOG。
- 个人小众服务只维护一份 `Global.list`。
- 私人订阅地址不进入公开仓库。

---

## 2. Shadowrocket 职责

- 原始订阅负责提供和更新节点。
- 主配置负责策略组、规则顺序、分流目标及 WestData 节点入口 Host 映射。
- `use-local-host-item-for-proxy = true` 确保代理连接实际使用本地 Host 映射。
- `policy-regex-filter` 根据节点名称建立地区节点池。
- 不继承订阅中的规则、DNS、Rewrite 或 MITM。

---

## 3. Clash Verge Rev 职责

- 原始订阅负责提供和更新 `proxies` 或 `proxy-providers`。
- 订阅扩展脚本重建策略组、规则与规则提供器；保留订阅的 DNS、Host 与节点入口参数。
- provider 地区过滤使用忽略大小写正则；空地区使用 `REJECT`，避免 `COMPATIBLE` 隐式直连。
- 订阅完全没有节点来源时停止生成配置。
- 生成结果由 Node 行为测试及固定版本 Mihomo 内核共同验证。

## 4. 规则分层设计

主配置采用以下顺序：

1. LAN
2. 专项服务规则
   - AI
   - Apple
   - Google
   - GitHub
   - Microsoft
   - YouTube
   - Telegram
   - 社交媒体
   - Apple 主规则与 Apple_Domain 域名规则共同覆盖 Apple 服务
3. Global 规则集
4. 中国直连规则
5. FINAL 兜底

规则自上而下匹配。AI 规则必须位于 Google 等可能产生覆盖的通用规则之前；中国字节跳动规则必须位于 TikTok 规则之前。

---

## 5. Global.list 定位

`Global.list` 只收录：

- 没有独立策略组的国际服务
- 工具和资料网站
- 个人长期使用的网站
- 冷门但明确需要代理的服务

不收录已有专项策略组的服务。例如 ChatGPT、YouTube、GitHub 和 Microsoft 不进入 Global。

Shadowrocket 通过远程 `RULE-SET` 直接读取 `Global.list`，不需要维护重复副本。

---

## 6. 为什么使用远程 Global 规则集

将个人域名硬编码到主配置会导致：

- 每增加一个网站都要修改主配置。
- 主配置持续膨胀。
- 修改过程更容易引入语法错误。

使用远程列表后，普通 Global 域名变更只需要维护 `Global.list`，Shadowrocket 会按远程规则更新机制获取新内容。

---

## 7. 维护流程

### 修改 Global 域名

1. 确认服务没有现成的专项策略组。
2. 将经过验证的域名添加到或移出 `Global.list`。
3. 提交 GitHub。
4. 检查 Shadowrocket 是否能更新并命中该规则。

这种修改不需要编辑主配置，也不必升级主配置版本号。

### 修改专项规则、架构或默认出口

1. 修改 Shadowrocket 主配置。
2. 检查策略组、分流目标和规则优先级。
3. 新增功能、架构或规则优先级变化时升级主配置版本号；已发布配置的修复或默认出口调整保留原路径。
4. 更新 README 与 CHANGELOG。
5. 运行 `bash scripts/check-config.sh`，完成 Shadowrocket 结构、Clash 行为、双端一致性、敏感信息与典型规则顺序检查。
6. 通过分支/PR 的 `Check configuration` 后再进入 `main`。

### 修改节点筛选

节点服务商改变命名格式时，需要检查 Shadowrocket 的 `policy-regex-filter` 是否能匹配实际节点名称。私人 WestData 配置只在本地使用 `node scripts/check-westdata-local.js /path/to/private-westdata.conf` 验证；检查结果仅输出计数与 PASS/FAIL，不生成或提交私人配置。

---

## 8. DNS 维护原则

- Shadowrocket 保留 WestData 原版 DNS 与系统绕过行为，不在独立配置中强制 DoH 或 DNS 劫持。
- Shadowrocket 代理连接必须启用 `use-local-host-item-for-proxy = true`，确保节点入口备用映射生效。
- DNS 参数修改后，应验证节点订阅更新、规则下载、国内直连和境外代理解析。
- 私人订阅地址不得写入 DNS 配置或公开文档。

---

## 9. 风险控制

- 不直接引入未知的大型 Global 规则。
- 不重新镜像完整的第三方专项规则库。
- 不把私人订阅地址、节点服务器、UUID、密码或令牌提交到公开仓库；本地私人配置由 `.gitignore` 排除，并由当前树敏感信息检查提供额外拦截。
- 规则顺序变化必须检查是否覆盖后续规则。
- Clash 的中国直连必须同时检查 `China` 与 `China_Domain`，避免 Bilibili 等域名落入 FINAL。
- 遇到异常时，先区分节点状态、策略组选择、远程规则下载和规则内容问题。
- 删除旧版本文件前确认新版配置已经验证可用；历史回退依赖 Git 记录。
- 凭据一旦公开，必须优先在服务端撤销或轮换；Git 历史重写只用于降低残留可见性，不能恢复凭据安全性。
- `main` 作为 raw 配置发布源，应使用 GitHub Ruleset/分支保护要求配置检查通过后才能合并。

---

## 10. 当前仓库用途

本仓库用于维护：

- Shadowrocket 完整分流配置
- Clash Verge Rev 订阅扩展脚本
- 双端共用的个人 `Global.list`
- 双端架构说明、自动检查与版本变更记录
- 私人 WestData 配置的本地只读兼容性验证工具
- 当前 Git 树敏感信息防回归检查
