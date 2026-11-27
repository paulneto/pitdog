#!/usr/bin/env bash
# End-to-end tests: each scenario is injected into a copy of app/index.html and run in
# headless Chrome with a fake clock. Prints PASS/FAIL per scenario; exits non-zero on failure.
# Usage: tests/e2e/run.sh [scenario-name-filter]
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; HERE="$ROOT/tests/e2e"; OUT="$HERE/.out"; mkdir -p "$OUT"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
fail=0; n=0
for sc in "$HERE"/scenarios/*.js; do
  name="$(basename "$sc" .js)"; [[ -n "${1:-}" && "$name" != *"$1"* ]] && continue
  win="$(grep -m1 '^// @window' "$sc" | awk '{print $3}')"; win="${win:-500,900}"
  page="$(grep -m1 '^// @page' "$sc" | awk '{print $3}')"; page="${page:-index.html}"   # default: the main app
  budget="$(grep -m1 '^// @budget' "$sc" | awk '{print $3}')"; budget="${budget:-4000}"   # virtual ms the page may run
  python3 -I - "$ROOT/app/$page" "$HERE/harness.js" "$sc" "$OUT/$name.html" <<'PY'
import sys; app,h,sc,out=sys.argv[1:]
s=open(app).read(); inj='<script>\n'+open(h).read()+'\n'+open(sc).read()+'\n</script>'
i=s.rindex('</body>'); open(out,'w').write(s[:i]+inj+s[i:])
PY
  rm -rf "$OUT/profile-$name"
  # shellcheck disable=SC2086  (CHROME_FLAGS is a list, e.g. --no-sandbox on CI)
  "$CHROME" --headless=new --disable-gpu --no-first-run ${CHROME_FLAGS:-} --user-data-dir="$OUT/profile-$name" --window-size="$win" \
    --virtual-time-budget="$budget" --dump-dom "file://$OUT/$name.html" 2>/dev/null > "$OUT/$name.dom.html"
  res="$(python3 -I -c "
import re,html,json,sys
s=open('$OUT/$name.dom.html').read(); m=re.search(r'<pre id=\"RESULT\">(.*?)</pre>',s,re.S)
if not m: print('FAIL|no result (page crashed?)'); sys.exit()
r=json.loads(html.unescape(m.group(1)))
print(('PASS' if not r['fails'] else 'FAIL')+'|'+str(r['checks'])+' checks'+''.join('\n    ✗ '+f for f in r['fails'])+''.join('\n    · '+l for l in r['log']))
")"
  n=$((n+1)); status="${res%%|*}"; [[ "$status" == PASS ]] || fail=$((fail+1))
  printf '%-22s %s\n' "$name" "${res/|/  }"
done
echo "—— $((n-fail))/$n scenarios passed"; [[ $fail -eq 0 ]]
