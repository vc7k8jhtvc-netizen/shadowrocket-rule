#!/usr/bin/env bash
set -euo pipefail

module="${1:-YouTube.Enhance.Shadowrocket.sgmodule}"
if [[ ! -f "$module" ]]; then
  echo "FAIL: module not found: $module" >&2
  exit 1
fi

mapfile -t urls < <(
  grep -oE 'script-path=https://raw\.githubusercontent\.com/[^,]+' "$module" \
    | sed 's/^script-path=//' \
    | sort -u
)

if (( ${#urls[@]} == 0 )); then
  echo "FAIL: no external script-path URLs found" >&2
  exit 1
fi

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

for url in "${urls[@]}"; do
  case "$url" in
    https://raw.githubusercontent.com/Maasea/sgmodule/master/Script/Youtube/*.js) ;;
    *)
      echo "FAIL: unexpected external script URL: $url" >&2
      exit 1
      ;;
  esac

  file="$tmpdir/$(basename "$url")"
  echo "Checking $url"
  curl -fsSL \
    --retry 3 \
    --retry-all-errors \
    --connect-timeout 10 \
    --max-time 30 \
    "$url" -o "$file"

  bytes="$(wc -c < "$file" | tr -d ' ')"
  if (( bytes < 512 )); then
    echo "FAIL: upstream script is unexpectedly small: $url ($bytes bytes)" >&2
    exit 1
  fi

  node --check "$file" >/dev/null
  sha256="$(sha256sum "$file" | awk '{print $1}')"
  echo "OK: $(basename "$url") bytes=$bytes sha256=$sha256"
done

echo "PASS: live YouTube upstream scripts are reachable and syntactically valid"
