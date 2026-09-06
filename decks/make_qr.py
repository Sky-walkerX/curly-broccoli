#!/usr/bin/env python3
"""
Generate the demo-video QR used on the title slide of both SIH decks.

Usage:
    python3 make_qr.py "https://youtu.be/REAL_VIDEO_ID"

With no argument it writes a clearly-marked PLACEHOLDER QR. Re-run with the real
video URL, then re-render the decks:  ./render.sh
The decks reference qr-demo.svg, so both pick up the new QR automatically.
"""
import sys, segno

# The URL the QR encodes. Swap this by passing your real demo link as an argument.
URL = sys.argv[1] if len(sys.argv) > 1 else "https://youtu.be/your-demo-id"

# error='m' (~15% recovery) keeps the code light and easy to scan for a short URL.
qr = segno.make(URL, error='m')
qr.save(
    "qr-demo.svg",
    scale=12,
    border=3,
    dark="#0c2230",   # deep ink — high contrast on white, still on-brand
    light="#ffffff",
)

# Also write the short display text shown under the QR (a scan fallback).
short = URL.replace("https://", "").replace("http://", "").rstrip("/")
open("qr-url.txt", "w").write(short)
print(f"wrote qr-demo.svg  ->  {URL}")
print(f"display text (qr-url.txt): {short}")
if "your-demo-id" in URL:
    print("NOTE: this is a PLACEHOLDER. Re-run with your real link before submitting.")
