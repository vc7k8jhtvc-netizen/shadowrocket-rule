#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
config="$root/Shadowrocket_Standalone_v2.6.5.conf"
routing_config="$root/Shadowrocket_Routing_v2.7.0.conf"
readme="$root/README.md"
global="$root/Global.list"
clash_script="$root/Clash_Verge_Rev_Script.js"
clash_check="$root/scripts/check-clash-script.js"
shadow_check="$root/scripts/check-shadowrocket.js"
routing_check="$root/scripts/check-shadowrocket-routing.js"
dual_check="$root/scripts/check-dual-client.js"
sensitive_check="$root/scripts/check-sensitive-data.js"
westdata_check="$root/scripts/check-westdata-local.js"
youtube_check="$root/scripts/check-youtube-module.js"

fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
line() { grep -nF "$1" "$config" | head -n1 | cut -d: -f1; }
require_line() { [[ -n "$(line "$1")" ]] || fail "missing config line: $1"; }

[[ -f "$config" ]] || fail "missing legacy standalone config"
[[ -f "$routing_config" ]] || fail "missing v2.7 routing config"
[[ -f "$clash_script" ]] || fail "missing Clash Verge Rev script"
[[ -f "$clash_check" ]] || fail "missing Clash script checker"
[[ -f "$shadow_check" ]] || fail "missing Shadowrocket checker"
[[ -f "$routing_check" ]] || fail "missing Shadowrocket routing checker"
[[ -f "$dual_check" ]] || fail "missing dual-client parity checker"
[[ -f "$sensitive_check" ]] || fail "missing sensitive-data checker"
[[ -f "$westdata_check" ]] || fail "missing WestData local checker"
[[ -f "$youtube_check" ]] || fail "missing YouTube module checker"

# Legacy v2.6.5 remains a complete fallback and keeps its original checks.
[[ $(grep -c '^\[General\]$' "$config") -eq 1 ]] || fail "[General] section"
[[ $(grep -c '^\[Proxy Group\]$' "$config") -eq 1 ]] || fail "[Proxy Group] section"
[[ $(grep -c '^\[Rule\]$' "$config") -eq 1 ]] || fail "[Rule] section"
[[ $(grep -c '^\[Host\]$' "$config") -eq 1 ]] || fail "[Host] section"

require_line '🤖 AI = select,🇺🇸 美国,🇸🇬 新加坡,🇯🇵 日本,🚀 默认代理,select=0'
require_line '🍎 Apple = select,DIRECT,🚀 默认代理,🇭🇰 香港,🇺🇸 美国,🇯🇵 日本,🌐 全部节点,select=0'
require_line '🪟 Microsoft = select,DIRECT,🚀 默认代理,🇺🇸 美国,🌐 全部节点,select=0'
require_line '🐟 FINAL = select,DIRECT,🚀 默认代理,🌐 全部节点,select=0'

global_line=$(line 'RULE-SET,https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Global.list,🌍 Global')
china_line=$(line 'RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/China/China.list,DIRECT')
china_domain_line=$(line 'DOMAIN-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket/China/China_Domain.list,DIRECT')
geoip_line=$(line 'GEOIP,CN,DIRECT')
final_line=$(line 'FINAL,🐟 FINAL')
(( global_line < china_line && china_line < china_domain_line && china_domain_line < geoip_line && geoip_line < final_line )) || fail 'China-rule order'

grep -qF 'Shadowrocket_Routing_v2.7.0.conf' "$readme" || fail 'README routing config reference'
grep -qF 'Shadowrocket_Standalone_v2.6.5.conf' "$readme" || fail 'README legacy config reference'
grep -qF 'Clash_Verge_Rev_Script.js' "$readme" || fail 'README Clash script reference'
grep -qF 'https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Shadowrocket_Routing_v2.7.0.conf' "$readme" || fail 'README routing import URL'
grep -qF 'https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Shadowrocket_Standalone_v2.6.5.conf' "$readme" || fail 'README legacy import URL'
! grep -Eq '^DOMAIN-SUFFIX,npmjs\.(com|org)$' "$global" || fail 'npm must not duplicate GitHub rules'

command -v node >/dev/null 2>&1 || fail 'node is required for configuration checks'
node --check "$clash_script"
node --check "$shadow_check"
node --check "$routing_check"
node --check "$dual_check"
node --check "$sensitive_check"
node --check "$westdata_check"
node --check "$youtube_check"
node "$sensitive_check"
node "$shadow_check"
node "$routing_check"
node "$dual_check"
node "$clash_check" "$clash_script"
node "$youtube_check"

printf 'PASS: configuration static checks\n'
