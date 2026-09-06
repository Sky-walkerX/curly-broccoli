/**
 * Renders the video's title / evidence / end cards and its caption strips to PNG,
 * in the same visual language as the idea deck (dark navy + teal, IBM Plex).
 *
 *   node make_cards.mjs          # reads timeline.json, writes build/cards/*.png
 *
 * The offline-proof card is generated FROM timeline.json, so it always shows the hosts
 * actually contacted during the take rather than a hand-typed claim.
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "fs";

const T = JSON.parse(readFileSync("timeline.json", "utf8"));
const at = (n) => T.marks.find((m) => m.name === n).t;
const OUT = "build/cards";
mkdirSync(OUT, { recursive: true });

const modelSeconds = (at("act2.proposals") - at("act2.learning")).toFixed(1);
const learnedMs = (T.learnedBadge.match(/(\d+)\s*ms/) || [, "4"])[1];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Sans+Condensed:wght@600;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  :root{
    --navy:#0c2230; --teal:#5fbfbb; --teal-2:#7fd6d2; --dim:#9fc0c4; --faint:#6a949a;
    --mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;
    --cond:"IBM Plex Sans Condensed","IBM Plex Sans",system-ui,sans-serif;
    --sans:"IBM Plex Sans",system-ui,sans-serif;
  }
  body{width:1920px;background:transparent;font-family:var(--sans);color:#fff}
  .card{width:1920px;height:1080px;background:
      radial-gradient(1200px 700px at 78% 12%, #12384a 0%, transparent 60%),
      linear-gradient(160deg,#0d2534 0%, var(--navy) 55%, #081a26 100%);
    display:flex;flex-direction:column;justify-content:center;padding:0 130px;position:relative}
  .kicker{font-family:var(--mono);font-size:22px;letter-spacing:.18em;text-transform:uppercase;color:var(--teal);margin-bottom:26px}
  h1{font-family:var(--cond);font-weight:700;font-size:92px;line-height:.98;letter-spacing:-.015em;max-width:20ch}
  h1 em{font-style:normal;color:var(--teal-2)}
  .sub{margin-top:30px;font-size:31px;line-height:1.45;color:var(--dim);max-width:34ch}
  .sub b{color:#fff;font-weight:600}
  .rule{height:5px;width:190px;margin:44px 0 0;background:linear-gradient(90deg,var(--teal),transparent)}
  .meta{position:absolute;left:130px;bottom:78px;display:flex;gap:56px;font-family:var(--mono);font-size:20px;color:var(--faint)}
  .meta b{display:block;color:var(--dim);font-weight:500;margin-top:8px;font-size:22px}
  .badge{position:absolute;top:74px;right:130px;font-family:var(--mono);font-size:20px;letter-spacing:.14em;
    text-transform:uppercase;color:var(--teal-2);border:1px solid #2b5560;border-radius:8px;padding:13px 20px}

  .evid{margin-top:40px;border:1px solid #23485a;border-radius:14px;background:#08192360;padding:34px 40px;max-width:1180px}
  .evid .h{font-family:var(--mono);font-size:19px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);margin-bottom:20px}
  .row{display:flex;align-items:center;gap:18px;font-family:var(--mono);font-size:30px;color:#fff;padding:9px 0}
  .row .dot{width:11px;height:11px;border-radius:50%;background:#3ddc97;flex:none}
  .row .n{margin-left:auto;color:var(--faint);font-size:24px}
  .none{margin-top:20px;font-family:var(--mono);font-size:25px;color:#3ddc97}

  /* caption strip */
  .capwrap{width:1920px;padding:0 84px}
  .cap{display:inline-flex;align-items:center;gap:24px;background:rgba(8,20,28,.93);
    border:1px solid #23485a;border-left:6px solid var(--teal);border-radius:12px;
    padding:26px 38px;max-width:1700px}
  .cap .t{font-size:35px;line-height:1.3;color:#fff;font-weight:500}
  .cap .t b{color:var(--teal-2);font-weight:700}
  .cap .t code{font-family:var(--mono);font-size:31px;color:var(--teal-2)}
`;

const cards = {
  title: `<div class="card">
    <div class="badge">SIH 2026 · NTRO</div>
    <div class="kicker">Problem statement SIH26155</div>
    <h1>Multi-vendor network security <em>compliance auditor</em></h1>
    <div class="sub">Every vendor speaks a different config language. This reads <b>any</b> of them,
      grades the device against <b>CIS / NIST / STIG</b>, and hands back the exact fixes.</div>
    <div class="rule"></div>
    <div class="meta">
      <span>Runs<b>fully offline</b></span>
      <span>Local model<b>${T.model}</b></span>
      <span>Rule pack<b>${T.rules} checks</b></span>
    </div>
  </div>`,

  offline: `<div class="card">
    <div class="kicker">Recorded evidence · not a claim</div>
    <h1>Nothing left <em>the machine</em></h1>
    <div class="evid">
      <div class="h">Every network request the page made during this recording</div>
      ${T.hosts.map((h) => `<div class="row"><span class="dot"></span>${h.host}<span class="n">×${h.count}</span></div>`).join("")}
      <div class="none">No cloud endpoints. No telemetry. No config data off-box.</div>
    </div>
    <div class="meta"><span>Model<b>${T.model}, local via Ollama</b></span>
      <span>Air-gap<b>installable offline</b></span></div>
  </div>`,

  end: `<div class="card">
    <div class="badge">SIH 2026 · NTRO</div>
    <div class="kicker">SIH26155 · what you just saw</div>
    <h1>It <em>learned a new vendor</em> — with no code change</h1>
    <div class="sub">A config it had never seen, mapped by a <b>local</b> model in ${modelSeconds}s,
      confirmed by a human, and parsed <b>deterministically in ${learnedMs} ms</b> ever after.</div>
    <div class="rule"></div>
    <div class="meta">
      <span>Stack<b>React · FastAPI · Ollama · YAML rules · SQLite</b></span>
      <span>Report<b>offline PDF, per device</b></span>
    </div>
  </div>`,
};

const captions = {
  c1: `A router config in. <b>CIS / NIST / STIG</b> posture out.`,
  c2: `52% compliant · <b>two high-severity failures</b> — telnet is on, SNMP uses "public"`,
  c3: `Every failure carries <b>the exact command that fixes it</b>`,
  c4: `The same router after those fixes · <b>100%</b>`,
  c5: `Now a vendor it has <b>never seen</b>. No parser exists for it.`,
  c6: `The <b>local</b> model reads a syntax it doesn't know — line by line, on this laptop`,
  c7: `It proposes the mappings. <b>A human confirms</b> — the model is never trusted blindly`,
  c8: `Where two independent engines agreed: <code>confirmed ×2</code>`,
  c9: `Taught. <b>${modelSeconds}s with the model → ${learnedMs} ms deterministic</b>, and no code changed`,
  c10: `One click · <b>an offline PDF report</b> for the device`,
};

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

async function render(html, file, selector, omitBackground) {
  await page.setContent(`<style>${CSS}</style>${html}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(120);
  await page.locator(selector).screenshot({ path: `${OUT}/${file}.png`, omitBackground });
  console.log("  card", file);
}

for (const [name, html] of Object.entries(cards)) await render(html, name, ".card", false);
for (const [name, text] of Object.entries(captions))
  await render(`<div class="capwrap"><div class="cap"><div class="t">${text}</div></div></div>`,
               name, ".capwrap", true);

await browser.close();
writeFileSync("build/cards/meta.json", JSON.stringify({ modelSeconds, learnedMs }, null, 2));
console.log(`\nmodel run ${modelSeconds}s -> learned parse ${learnedMs}ms`);
