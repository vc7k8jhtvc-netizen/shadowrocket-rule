# 变更记录

仅保留关键结果。当前用法见 [README](README.md)，完整修改与临时试验见 [Git 历史](https://github.com/vc7k8jhtvc-netizen/shadowrocket-rule/commits/main/)。

## 2026-09-07 · v2.7.0

- 新增 `Shadowrocket_Routing_v2.7.0.conf`：只维护 `include = WestData.conf`、策略组与分流规则。
- 节点、General / DNS / TUN、Host、Google Rewrite/MITM 等基础能力改为直接继承原始 WestData 配置，不再在 Routing 配置中复制。
- `Shadowrocket_Standalone_v2.6.5.conf` 暂不删除，继续作为独立回退路径并保留自动检查。
- Shadowrocket / Clash 双端一致性检查切换到 v2.7.0 Routing；新增职责边界检查，防止基础参数重新进入轻量配置。
- WestData 私人本地检查增加 Host、Google Rewrite/MITM 等底座依赖验证，但不输出凭据。

## 2026-09-07 · v2.6.5 maintenance

- 将设备实际必需的 Google CN Rewrite/MITM 同步回 Shadowrocket 独立配置；仅保留公开配置，设备 CA、口令与 PKCS#12 材料不入库。
- 文档精简：合并重复的架构、更新及检查说明，移除已撤回试验和已删除模块的实现细节。
- Clash 全部节点组补齐空组阻断；无 provider 且静态节点全部不符合命名时停止生成。
- Clash LAN 增加 `no-resolve`，避免前置局域网判断主动解析域名。
- YouTube 模块补齐 Worker 精确分流、安装与停用说明，以及模块结构检查。
- 增加 Mihomo 运行期空组与 LAN DNS 回归验证。
- 移除会导致原生 X App 刷新异常的 X 去广告方案；保留 X/Twitter 的正常社交分流。

## 2026-09-06

- 恢复 Clash Verge Rev 扩展脚本与 Shadowrocket 并行维护，共用 Global.list。
- Clash 改为保留订阅 DNS、hosts、IPv6 和节点入口参数；统一两端 WestData 节点筛选。
- 补齐中国域名集，精简 AI 重复规则；npm 继续使用 GitHub 专项规则。
- 调整默认出口：AI 美国，Apple / Microsoft / FINAL 直连，其余业务跟随默认代理。
- 收敛 Shadowrocket 稳定路径至 v2.6.5，删除多余主配置与临时脚本。
- 加入双端检查、私人 WestData 本地验证、当前树凭据扫描与 Mihomo 内核验证。
- 普通维护允许直接更新 main，不再强制 PR 或分支保护。

## 2026-09-05 · v2.5.1—v2.6.5

- 补齐已有服务的关联域名及 Apple 域名集。
- 修复 WestData 入口 Host 映射及其代理连接开关，恢复兼容的 Shadowrocket DNS 与系统绕过设置。
- 撤回排查期间的强制 DoH、DNS 劫持和直连失败转代理设置。

## 2026-09-04 · v2.5

- 建立 Shadowrocket 独立分流配置与远程 Global.list。
