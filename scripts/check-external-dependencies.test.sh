#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
checker="$root/scripts/check-external-dependencies.sh"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
voice_fixture="$tmpdir/voice.json"
export VOICE_FIXTURE="$voice_fixture"
node - "$root/OpenAI_Voice.list" "$voice_fixture" <<'NODE'
const fs = require('fs');
const lines = fs.readFileSync(process.argv[2], 'utf8').split('\n');
const creationTime = (lines.find(line => line.startsWith('# Creation-Time: ')) || '').slice('# Creation-Time: '.length);
const prefixes = lines.filter(line => line.startsWith('IP-CIDR,')).map(line => ({ ipv4Prefix: line.split(',')[1] }));
fs.writeFileSync(process.argv[3], JSON.stringify({ creationTime, prefixes }));
NODE

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
case "$url" in
  https://openai.com/chatgpt-voice.json)
    if [[ "${MALFORM_VOICE:-}" == 1 ]]; then
      printf '{"creationTime":"fixture","prefixes":[{"ipv4Prefix":"0.0.0.0/0"}]}' > "$out"
    else
      cat "$VOICE_FIXTURE" > "$out"
    fi
    ;;
  *.js)
    printf '/* upstream fixture */\nconst ok = true;\n' > "$out"
    for _ in $(seq 1 64); do printf '/* padding */\n' >> "$out"; done
    ;;
  */Clash/Lan/Lan.yaml)
    if [[ "${MALFORM_CLASSICAL:-}" == 1 ]]; then
      printf '# malformed but non-empty\nDOMAIN-SUFFIX,example.com\n' > "$out"
    elif [[ "${EMPTY_CLASSICAL:-}" == 1 ]]; then
      printf '# empty payload\npayload:\n' > "$out"
    else
      printf '# fixture\npayload:\n  - DOMAIN-SUFFIX,example.com\n' > "$out"
    fi
    ;;
  *_Domain.yaml)
    if [[ "${MALFORM_DOMAIN_DOT:-}" == 1 ]]; then
      printf "# fixture\npayload:\n  - '.example.com'\n" > "$out"
    else
      printf "# fixture\npayload:\n  - '+.example.com'\n" > "$out"
    fi
    ;;
  *.yaml)
    printf '# fixture\npayload:\n  - DOMAIN-SUFFIX,example.com\n' > "$out"
    ;;
  *.list|*.txt)
    printf '# fixture\nDOMAIN-SUFFIX,example.com\n' > "$out"
    ;;
  *)
    printf '# generic fixture\nexample.com\n' > "$out"
    ;;
esac
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
  echo 'FAIL: checker accepted unexpected YouTube upstream URL' >&2
  exit 1
fi

cat > "$tmpdir/no-url.sgmodule" <<'EOF'
[Script]
# no external script-path
EOF
if PATH="$tmpdir/bin:$PATH" bash "$checker" "$tmpdir/no-url.sgmodule" >/dev/null 2>&1; then
  echo 'FAIL: checker accepted module without YouTube external script URLs' >&2
  exit 1
fi

if MALFORM_CLASSICAL=1 PATH="$tmpdir/bin:$PATH" bash "$checker" "$tmpdir/module.sgmodule" >/dev/null 2>&1; then
  echo 'FAIL: checker accepted malformed Clash classical provider content' >&2
  exit 1
fi

if EMPTY_CLASSICAL=1 PATH="$tmpdir/bin:$PATH" bash "$checker" "$tmpdir/module.sgmodule" >/dev/null 2>&1; then
  echo 'FAIL: checker accepted empty Clash classical YAML payload' >&2
  exit 1
fi

if MALFORM_DOMAIN_DOT=1 PATH="$tmpdir/bin:$PATH" bash "$checker" "$tmpdir/module.sgmodule" >/dev/null 2>&1; then
  echo 'FAIL: checker accepted leading-dot Clash domain provider entries' >&2
  exit 1
fi

if MALFORM_VOICE=1 PATH="$tmpdir/bin:$PATH" bash "$checker" "$tmpdir/module.sgmodule" >/dev/null 2>&1; then
  echo 'FAIL: checker accepted broad OpenAI voice prefix' >&2
  exit 1
fi

echo 'PASS: external dependency checker offline regressions'
