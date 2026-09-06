# Narration script — SIH26155 demo video

`demo-silent.mp4` · 1:39 · 1920×1080 · no audio track (yet)

Read these over the silent cut. Timings are where each line **starts** — the video is
already paced with gaps, so speak at a normal pace and let the silences sit. Nothing
here needs to be rushed; if you overrun a beat by a second it still works.

| Time | On screen | Say |
|---|---|---|
| 0:00 | Title card | "Every network vendor speaks a different config language, so security audits are manual and slow. This tool reads any of them — completely offline." |
| 0:09 | Empty app | "Everything you'll see runs on this laptop." |
| 0:13 | Cisco report, 52% | "A Cisco config. Instantly — fifty-two percent compliant. Two high-severity failures: telnet is on, and SNMP still uses 'public'." |
| 0:20 | Findings + remediation | "Each failure cites its CIS, NIST and STIG rule — and gives the exact command that fixes it." |
| 0:25 | Copy clicked | "Copy it straight into the device." |
| 0:31 | Hardened, 100% | "The same router after those fixes — one hundred percent." |
| 0:37 | AcmeOS, live learning | "Now the part that matters. This is AcmeOS — a vendor the tool has never seen. There's no parser for it. So the local model, running on this laptop, reads a config syntax it doesn't know and maps each line into one common security schema. Nothing is sent anywhere." |
| 0:56 | Teach panel | "It proposes the mappings — and a person confirms them. The model is never trusted blindly." |
| 1:03 | `confirmed ×2` badges | "A second, independent keyword check ran alongside it. Where both agreed, the mapping is marked confirmed twice." |
| 1:10 | Learned vendor · 4 ms | "Confirmed — and it's now a known vendor. Eighteen seconds with the model becomes four milliseconds. And no code changed." |
| 1:18 | PDF exported | "One click gives an offline PDF report for the device." |
| 1:22 | Evidence card | "Every network request during this recording went to localhost. Nothing left the machine — which is exactly what an air-gapped network needs." |
| 1:31 | End card | "It learns a new vendor with no code change. And it does it offline." |

**Word count is deliberately under budget.** Silence reads as confidence; filling every
second reads as nerves.

## Recording your voice

1. QuickTime Player → File → **New Audio Recording** → record while playing
   `demo-silent.mp4` so you stay in sync. Save as `voice.m4a` in this folder.
2. Quiet room, phone on silent, mic ~20 cm away and slightly off-axis (stops plosives).
3. Do one full take rather than many patched ones — small stumbles are fine and sound
   human; obvious edits do not.

## Mixing it together

```bash
cd video
ffmpeg -i demo-silent.mp4 -i voice.m4a -c:v copy -c:a aac -b:a 192k -shortest demo-final.mp4
```

If your voice track runs slightly longer than the video, drop `-shortest` and add
`-t 99.2` to cut it at the video's length instead.

Then upload `demo-final.mp4` to YouTube (unlisted is fine) and run:

```bash
./set_demo_url.sh https://youtu.be/YOUR_ID     # QR + both decks + re-render, one command
```
