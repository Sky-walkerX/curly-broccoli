#!/usr/bin/env bash
# Point the decks' demo QR at the real video, in one step.
#
#   ./set_demo_url.sh https://youtu.be/REAL_ID
#
# Regenerates the QR, updates the printed URL under it on BOTH title slides, and
# re-renders both PDFs. Refuses a placeholder URL so the decks can't be submitted
# with a dead QR still live.
set -euo pipefail
cd "$(dirname "$0")/../decks"

URL="${1:-}"
if [ -z "$URL" ]; then
  echo "usage: ./set_demo_url.sh https://youtu.be/YOUR_ID" >&2; exit 1
fi
case "$URL" in
  *your-demo-id*|*REAL_ID*|*YOUR_ID*)
    echo "REFUSING: '$URL' is still a placeholder." >&2; exit 1 ;;
  http://*|https://*) ;;
  *) echo "REFUSING: '$URL' needs to start with http:// or https://" >&2; exit 1 ;;
esac

# -E: BSD sed (macOS) has no \? in basic regex, so the prefix would survive unstripped.
SHORT=$(printf '%s' "$URL" | sed -E -e 's#^https?://##' -e 's#/$##')

echo "-> QR"
python3 make_qr.py "$URL"

echo "-> deck title slides"
for f in SIH26155-compliance-auditor.html SIH26145-threat-detection.html; do
  # the visible fallback text under the QR
  python3 - "$f" "$SHORT" <<'PY'
import re, sys
path, short = sys.argv[1], sys.argv[2]
s = open(path).read()
new, n = re.subn(r'(<div class="dq-url">)[^<]*(</div>)', lambda m: m.group(1) + short + m.group(2), s)
if n != 1:
    raise SystemExit(f"{path}: expected exactly one .dq-url, found {n}")
open(path, "w").write(new)
print(f"   {path}  ->  {short}")
PY
done

echo "-> re-rendering PDFs"
./render.sh

echo
echo "Done. Check that neither PDF still shows a placeholder:"
grep -l "your-demo-id" *.html 2>/dev/null && echo "  !! placeholder still present" || echo "  clean — no placeholder text left in the decks"
