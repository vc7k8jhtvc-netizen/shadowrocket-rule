#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
checker="$root/scripts/check-external-dependencies.sh"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

mkdir -p "$tmpdir/bin"
cat > "$tmpdir/bin/curl" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
out=''
url=''
while (($#)); do
  case "$1" in
    -o) out="$2"; shift 2 ;;
    http*) url="$1"; shift ;;
    *) shift ;;
  esac
done
[[ -n "$out" && -n "$url" ]]
printf '/* upstream fixture */\n' > "$out"
for _ in $(seq 1 64); do printf 'const ok = true;\n' >> "$out"; done
EOF
chmod +x "$tmpdir/bin/curl"

cat > "$tmpdir/module.sgmodule" <<'EOF'
[Script]
youtube.response = type=http-response,script-path=https://raw.githubusercontent.com/Maasea/sgmodule/master/Script/Youtube/youtube.response.js
EOF

PATH="$tmpdir/bin:$PATH" bash "$checker" "$tmpdir/module.sgmodule" >/dev/null

cat > "$tmpdir/bad-url.sgmodule" <<'EOF'
[Script]
youtube.response = type=http-response,script-path=https://raw.githubusercontent.com/example/repo/master/youtube.response.js
EOF
if PATH="$tmpdir/bin:$PATH" bash "$checker" "$tmpdir/bad-url.sgmodule" >/dev/null 2>&1; then
  echo 'FAIL: checker accepted unexpected upstream URL' >&2
  exit 1
fi

cat > "$tmpdir/no-url.sgmodule" <<'EOF'
[Script]
# no external script-path
EOF
if PATH="$tmpdir/bin:$PATH" bash "$checker" "$tmpdir/no-url.sgmodule" >/dev/null 2>&1; then
  echo 'FAIL: checker accepted module without external script URLs' >&2
  exit 1
fi

echo 'PASS: external dependency checker offline regressions'
