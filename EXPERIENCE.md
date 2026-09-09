# 维护约定

安装、默认出口和日常排查见 [README](README.md)。

## 架构

- `WestData.conf`：节点、General / DNS / TUN、Host、URL Rewrite、MITM 与供应商基础设置。
- `Shadowrocket_Routing.conf`：当前高优先级配置，负责 Proxy Group 与 Rule。
- Clash Verge Rev：保留订阅基础参数，扩展脚本重建策略组与规则。

## 核心目标

Shadowrocket 必须满足：

> 所有业务分流与最终兜底均由当前 Routing 接管；WestData `[Rule]` 不应承接任何剩余流量。

同时必须继续继承 WestData 的 DNS、MITM、Host、Rewrite、节点及其他基础能力。

## Shadowrocket 终结机制

- 不依赖特殊 `FINAL` 终结，因为 `FINAL` 会作为最终兜底参与自动编译。
- 当前 Routing 在中国规则之后加入：
  - `DOMAIN-WILDCARD,*,🌍 国际兜底`
  - `IP-CIDR,0.0.0.0/0,🌍 国际兜底,no-resolve`
  - `IP-CIDR,::/0,🌍 国际兜底,no-resolve`
- 域名规则负责终结剩余域名流量；两条 IP-CIDR 只终结直接 IP 流量，`no-resolve` 防止其主动解析域名。
- 修改该机制后必须实机核对 WestData 中已知冲突样本，不能只靠静态检查宣布完成。

## 必须保留的行为

- `[General]` 保留 `include = WestData.conf`。
- 分流语义：LAN → AI → Advertising → 其他专项 → China / China_Domain → GEOIP → 显式国际兜底。
- AI 在 Google 之前；字节跳动大陆直连规则在 TikTok 之前。
- 代理分组显示顺序固定为：总控 → 业务 → 广告拦截 → 地区节点池。
- Shadowrocket / Clash 的业务策略、默认出口和最终兜底语义保持一致；实现方式允许不同。
- Clash 继续整体重建 rules / rule-providers，因此无需复制 Shadowrocket 的显式终结规则。

## 发布验证

发布前运行：

```bash
bash scripts/check-config.sh
```

静态检查必须确认：

- Routing 仅包含 General / Proxy Group / Rule；
- 不存在 Shadowrocket `FINAL`；
- 显式域名、IPv4、IPv6 终结规则均存在且位于当前文件末端；
- 双端业务策略和显示顺序一致；
- 版本、敏感信息与模块结构正常。

实机必须核对：

- `steampowered.com` → 🌍 国际兜底，而不是 WestData DIRECT；
- `wikipedia.org` → 🌍 国际兜底，而不是 WestData PROXY；
- 中国服务仍正常直连；
- AI / 广告 / YouTube / GitHub 专项仍正常命中；
- DNS、Google Rewrite 与 MITM 仍由 WestData 正常提供。

若冲突样本仍进入 WestData Rule，不得通过手工补域名掩盖，应重新评估 include 编译机制。
