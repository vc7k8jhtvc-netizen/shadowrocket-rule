#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
routing_config="$root/Shadowrocket_Routing.conf"
readme="$root/README.md"
global="$root/Global.list"
clash_script="$root/Clash_Verge_Rev_Script.js"
clash_check="$root/scripts/check-clash-script.js"
routing_check="$root/scripts/check-shadowrocket-routing.js"
dual_check="$root/scripts/check-dual-client.js"
sensitive_check="$root/scripts/check-sensitive-data.js"
westdata_check="$root/scripts/check-westdata-local.js"
youtube_check="$root/scripts/check-youtube-module.js"

fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

[[ -f "$routing_config" ]] || fail "missing Shadowrocket routing config"
[[ -f "$clash_script" ]] || fail "missing Clash Verge Rev script"
[[ -f "$clash_check" ]] || fail "missing Clash script checker"
[[ -f "$routing_check" ]] || fail "missing Shadowrocket routing checker"
[[ -f "$dual_check" ]] || fail "missing dual-client parity checker"
[[ -f "$sensitive_check" ]] || fail "missing sensitive-data checker"
[[ -f "$westdata_check" ]] || fail "missing WestData local checker"
[[ -f "$youtube_check" ]] || fail "missing YouTube module checker"

grep -qF 'Shadowrocket_Routing.conf' "$readme" || fail 'README routing config reference'
grep -qF 'Clash_Verge_Rev_Script.js' "$readme" || fail 'README Clash script reference'
grep -qF 'https://raw.githubusercontent.com/vc7k8jhtvc-netizen/shadowrocket-rule/main/Shadowrocket_Routing.conf' "$readme" || fail 'README routing import URL'
! grep -Eq '^DOMAIN-SUFFIX,npmjs\.(com|org)$' "$global" || fail 'npm must not duplicate GitHub rules'

command -v node >/dev/null 2>&1 || fail 'node is required for configuration checks'
node --check "$clash_script"
node --check "$routing_check"
node --check "$dual_check"
node --check "$sensitive_check"
node --check "$westdata_check"
node --check "$youtube_check"
node "$sensitive_check"
node "$routing_check"
node "$dual_check"
node "$clash_check" "$clash_script"
node "$youtube_check"

printf 'PASS: configuration static checks\n'
