#!/usr/bin/env bash
# Re-render the SIH idea decks to PDF after editing the HTML (e.g. team name/ID).
# Usage:  ./render.sh            (renders both)
#         ./render.sh SIH26155-compliance-auditor.html   (one file)
set -euo pipefail
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
cd "$(dirname "$0")"
files=( "${@:-}" )
[ -z "${files[0]:-}" ] && files=( SIH26155-compliance-auditor.html SIH26145-threat-detection.html )
for f in "${files[@]}"; do
  out="${f%.html}.pdf"
  "$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=15000 \
    --print-to-pdf="$out" "file://$PWD/$f" 2>/dev/null
  echo "rendered  $out"
done
