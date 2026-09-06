#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
config="$root/Shadowrocket_Standalone_v2.6.5.conf"
readme="$root/README.md"
global="$root/Global.list"
clash_script="$root/Clash_Verge_Rev_Script.js"
clash_check="$root/scripts/check-clash-script.js"

fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
line() { grep -nF "$1" "$config" | head -n1 | cut -d: -f1; }
require_line() { [[ -n "$(line "$1")" ]] || fail "missing config line: $1"; }

[[ -f "$config" ]] || fail "missing primary config"
[[ -f "$clash_script" ]] || fail "missing Clash Verge Rev script"
[[ -f "$clash_check" ]] || fail "missing Clash script checker"
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

grep -qF 'Shadowrocket_Standalone_v2.6.5.conf' "$readme" || fail 'README primary config reference'
grep -qF 'Clash_Verge_Rev_Script.js' "$readme" || fail 'README Clash script reference'
grep -qF 'https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Shadowrocket_Standalone_v2.6.5.conf' "$readme" || fail 'README import URL'
! grep -Eq '^DOMAIN-SUFFIX,npmjs\.(com|org)$' "$global" || fail 'npm must not duplicate GitHub rules'

command -v node >/dev/null 2>&1 || fail 'node is required for Clash script checks'
node --check "$clash_script"
node "$clash_check" "$clash_script"

printf 'PASS: configuration static checks\n'
