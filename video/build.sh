#!/usr/bin/env bash
# Cuts the recorded take into the finished silent video.
#
#   ./build.sh            -> demo-silent.mp4  (1920x1080, no audio, ready for voiceover)
#
# Caption timings come from timeline.json, so they follow the take that was actually
# recorded rather than hand-tuned numbers that rot the moment you re-record.
set -euo pipefail
cd "$(dirname "$0")"
RAW=$(ls raw/*.webm | head -1)
B=build
mkdir -p $B
ENC=(-c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -r 30 -an)

echo "-> normalising footage ($(basename "$RAW"))"
# Recorded at 1440x810; upscaled to 1080p so the UI text reads on a phone.
# tpad holds the final frame so the closing caption has room to breathe.
ffmpeg -y -loglevel error -i "$RAW" \
  -vf "scale=1920:1080:flags=lanczos,tpad=stop_mode=clone:stop_duration=2,fps=30" \
  "${ENC[@]}" $B/footage.mp4

echo "-> rendering the exported PDF's first page"
# raw/report.pdf is the file the app actually produced during the take; QuickLook gives
# us a page image without adding a PDF-rendering dependency.
qlmanage -t -s 1600 -o "$B" raw/report.pdf >/dev/null 2>&1
mv "$B/report.pdf.png" "$B/pdf-page.png"

echo "-> caption + PDF overlays"
python3 - <<'PY' > $B/filter.txt
import json
T = json.load(open("timeline.json"))
at = {m["name"]: m["t"] for m in T["marks"]}
end = at["end"] + 2.0                      # tpad tail

# (caption, start, end) -- anchored to what actually happened in the take
cues = [
    ("c1",  1.0,              at["act1.click"] - 0.2),
    ("c2",  at["act1.report"] + 0.4,   at["act1.findings"] - 0.3),
    ("c3",  at["act1.findings"] + 0.4, at["act1b.click"] - 0.9),
    ("c4",  at["act1b.report"] + 0.4,  at["act2.click"] - 0.4),
    ("c5",  at["act2.click"] + 0.3,    at["act2.learning"] + 4.5),
    ("c6",  at["act2.learning"] + 5.0, at["act2.proposals"] - 0.3),
    ("c7",  at["act2.proposals"] + 0.5, at["act2.mappings"] - 0.3),
    ("c8",  at["act2.mappings"] + 0.4, at["act3.click"] - 0.5),
    ("c9",  at["act3.learned"] + 0.7,  at["pdf.saved"] - 0.3),
    ("c10", at["pdf.saved"] + 0.4,     end),
]

parts, prev = [], "[0:v]"
for i, (name, s, e) in enumerate(cues):
    lbl = f"[v{i}]"
    parts.append(f"{prev}[{i+1}:v]overlay=x=0:y=H-h-64:enable='between(t,{s:.2f},{e:.2f})'{lbl}")
    prev = lbl
# the real exported PDF, shown after the export click
pdf_in = len(cues) + 1
parts.append(f"{prev}[{pdf_in}:v]overlay=x=W-w-90:y=250:"
             f"enable='between(t,{at['pdf.saved'] + 0.5:.2f},{end:.2f})'[vout]")
print(";".join(parts))
print("INPUTS " + " ".join(n for n, _, _ in cues), end="")
PY

FILTER=$(head -1 $B/filter.txt)
CAPS=$(tail -1 $B/filter.txt | sed 's/^INPUTS //')
INPUTS=(-i $B/footage.mp4)
for c in $CAPS; do INPUTS+=(-i $B/cards/$c.png); done
# scale the PDF page to a readable inset before it is overlaid
ffmpeg -y -loglevel error -i $B/pdf-page.png -vf "scale=-1:560" $B/pdf-inset.png
INPUTS+=(-i $B/pdf-inset.png)

ffmpeg -y -loglevel error "${INPUTS[@]}" -filter_complex "$FILTER" -map "[vout]" "${ENC[@]}" $B/main.mp4

echo "-> cards"
mk_card () { ffmpeg -y -loglevel error -loop 1 -t "$2" -i "$B/cards/$1.png" \
  -vf "scale=1920:1080,fps=30,fade=t=in:st=0:d=0.4,fade=t=out:st=$(echo "$2-0.4"|bc):d=0.4" \
  "${ENC[@]}" "$B/$1.mp4"; }
mk_card title   9
mk_card offline 9
mk_card end     7

echo "-> joining"
printf "file '%s'\n" title.mp4 main.mp4 offline.mp4 end.mp4 > $B/list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i $B/list.txt -c copy demo-silent.mp4

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 demo-silent.mp4)
printf "\ndemo-silent.mp4  %.1fs  " "$DUR"
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate -of csv=p=0 demo-silent.mp4
