#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
module="${1:-$root/YouTube.Enhance.Shadowrocket.sgmodule}"
routing="$root/Shadowrocket_Routing.conf"
clash_script="$root/Clash_Verge_Rev_Script.js"
clash_checker="$root/scripts/check-clash-script.js"

for file in "$module" "$routing" "$clash_script" "$clash_checker"; do
  if [[ ! -f "$file" ]]; then
    echo "FAIL: required file not found: $file" >&2
    exit 1
  fi
done

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

mapfile -t youtube_urls < <(
  grep -oE 'script-path=https://raw\.githubusercontent\.com/[^,]+' "$module" \
    | sed 's/^script-path=//' \
    | sort -u
)
if (( ${#youtube_urls[@]} == 0 )); then
  echo "FAIL: no YouTube external script-path URLs found" >&2
  exit 1
fi

mapfile -t shadowrocket_urls < <(
  grep -oE 'https://raw\.githubusercontent\.com/blackmatrix7/ios_rule_script/master/rule/[^,[:space:]]+' "$routing" \
    | sort -u
)
if (( ${#shadowrocket_urls[@]} == 0 )); then
  echo "FAIL: no Shadowrocket Blackmatrix rule URLs found" >&2
  exit 1
fi

MIHOMO_CONFIG_OUTPUT="$tmpdir/clash.json" node "$clash_checker" "$clash_script" >/dev/null
mapfile -t clash_specs < <(
  node - "$tmpdir/clash.json" <<'NODE'
const fs=require('fs');
const config=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
for(const provider of Object.values(config['rule-providers']||{})){
  if(typeof provider.url!=='string')continue;
  if(!provider.url.startsWith('https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/'))continue;
  process.stdout.write((provider.behavior||'unknown')+'\t'+provider.url+'\n');
}
NODE
)
if (( ${#clash_specs[@]} == 0 )); then
  echo "FAIL: no Clash Blackmatrix provider URLs found" >&2
  exit 1
fi

counter=0
download() {
  local kind="$1" url="$2" file bytes sha256 active
  ((counter+=1))
  file="$tmpdir/upstream-$counter"
  echo "Checking [$kind] $url"
  curl -fsSL \
    --retry 3 \
    --retry-all-errors \
    --connect-timeout 10 \
    --max-time 30 \
    "$url" -o "$file"

  bytes="$(wc -c < "$file" | tr -d ' ')"
  if (( bytes < 16 )); then
    echo "FAIL: upstream dependency is unexpectedly small: $url ($bytes bytes)" >&2
    exit 1
  fi
  if grep -qiE '<!doctype html|<html|404: Not Found' "$file"; then
    echo "FAIL: upstream dependency returned HTML/error content: $url" >&2
    exit 1
  fi

  case "$kind" in
    youtube)
      case "$url" in
        https://raw.githubusercontent.com/Maasea/sgmodule/master/Script/Youtube/*.js) ;;
        *) echo "FAIL: unexpected YouTube script URL: $url" >&2; exit 1 ;;
      esac
      if (( bytes < 512 )); then
        echo "FAIL: upstream YouTube script is unexpectedly small: $url ($bytes bytes)" >&2
        exit 1
      fi
      node --check "$file" >/dev/null
      ;;
    clash:classical)
      grep -qE '^[[:space:]]*payload:' "$file" || {
        echo "FAIL: Clash classical provider lost YAML payload structure: $url" >&2
        exit 1
      }
      ;;
    clash:domain)
      active="$(grep -Ev '^[[:space:]]*(#|$)' "$file" | head -n 1 || true)"
      [[ -n "$active" ]] || {
        echo "FAIL: Clash domain provider has no active entries: $url" >&2
        exit 1
      }
      ;;
    shadowrocket)
      active="$(grep -Ev '^[[:space:]]*(#|$)' "$file" | head -n 1 || true)"
      [[ -n "$active" ]] || {
        echo "FAIL: Shadowrocket rule source has no active entries: $url" >&2
        exit 1
      }
      ;;
    *)
      echo "FAIL: unknown dependency kind: $kind" >&2
      exit 1
      ;;
  esac

  sha256="$(sha256sum "$file" | awk '{print $1}')"
  echo "OK: bytes=$bytes sha256=$sha256"
done

for url in "${youtube_urls[@]}"; do download youtube "$url"; done
for url in "${shadowrocket_urls[@]}"; do download shadowrocket "$url"; done
for spec in "${clash_specs[@]}"; do
  behavior="${spec%%$'\t'*}"
  url="${spec#*$'\t'}"
  download "clash:$behavior" "$url"
done

echo "PASS: Maasea and Blackmatrix live dependencies are reachable and structurally valid"
