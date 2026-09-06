# Demo video for SIH26155

The video is produced from the **real prototype**, not a mockup: a Playwright script
drives the running app, and everything on screen is the app answering live requests.

```
./record_demo.mjs   ->  raw/*.webm + timeline.json   (the take + when each beat happened)
./make_cards.mjs    ->  build/cards/*.png            (title, evidence, end, captions)
./build.sh          ->  demo-silent.mp4              (1920x1080, silent, 1:39)
```

Then record narration over it (`narration.md`) and mux — the script is in that file.

## Why it is built this way

- **Nothing is staged.** The 18-second wait in Act 2 is the local model genuinely
  reading a config it has never seen; the mappings appear as it streams them.
- **The offline claim is evidence, not a caption.** `record_demo.mjs` logs every network
  request the page makes during the take, and `make_cards.mjs` renders that list into
  the evidence card. If the app ever called out, the card would say so.
- **It refuses to record a dishonest take.** If a previous run already taught AcmeOS, or
  the local model is unreachable, the script exits rather than record an Act 2 that
  quietly ran on the keyword fallback.

## Re-recording

```bash
cd ../prototype && ./run.sh --reset       # AcmeOS must be unknown again
cd ../video && node record_demo.mjs && node make_cards.mjs && ./build.sh
```

Caption timings are derived from `timeline.json`, so they follow the new take
automatically — no manual re-timing.

`raw/`, `build/` and the `.mp4`s are gitignored; they rebuild from these scripts.
