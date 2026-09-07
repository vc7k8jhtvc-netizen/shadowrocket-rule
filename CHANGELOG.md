# 变更记录

仅保留关键结果。当前用法见 [README](README.md)，完整修改与临时试验见 [Git 历史](https://github.com/vc7k8jhtvc-netizen/shadowrocket-rule/commits/main/)。

## 2026-09-07

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
