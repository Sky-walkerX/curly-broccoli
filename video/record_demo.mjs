/**
 * Records the SIH26155 demo by driving the real app — no mocks, no fixtures faked in.
 * Everything on screen is the running prototype answering real requests.
 *
 *   node record_demo.mjs            # writes raw/<recording>.webm + timeline.json
 *
 * It also logs every network request the page makes, which becomes the offline-proof
 * card in the finished cut: the evidence is collected during the take, not asserted.
 *
 * Requires the app on :8099 with a RESET database (AcmeOS must be an unknown vendor).
 * Run `cd ../prototype && ./run.sh --reset` first — the script refuses to record if a
 * previous run already taught AcmeOS, because Act 2 would silently be a lie.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, rmSync } from "fs";

const APP = "http://127.0.0.1:8099/";
const OUT = "raw";
const VIEW = { width: 1440, height: 810 };

// ---- preflight: the demo is only honest from a clean slate -------------------
const health = await (await fetch(APP + "api/health")).json();
const vendors = await (await fetch(APP + "api/vendors")).json();
if (vendors.taught.length) {
  console.error(`REFUSING: ${vendors.taught.map(v => v.vendor).join(", ")} already taught.`);
  console.error("Act 2 must start from a vendor the tool has never seen.");
  console.error("Fix: cd ../prototype && ./run.sh --reset");
  process.exit(1);
}
if (!health.ollama?.model_available) {
  console.error(`REFUSING: local model ${health.ollama?.model} unreachable — Act 2 would`);
  console.error("fall back to the keyword heuristic and the narration would be wrong.");
  process.exit(1);
}
console.log(`preflight ok · model ${health.ollama.model} · ${health.rules} rules · nothing taught yet`);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({
  viewport: VIEW, deviceScaleFactor: 1,
  recordVideo: { dir: OUT, size: VIEW },
});

const t0 = Date.now();                       // video frame 0 ≈ context creation
const marks = [];
const mark = (name) => {
  const t = (Date.now() - t0) / 1000;
  marks.push({ name, t: +t.toFixed(2) });
  console.log(`  [${t.toFixed(1).padStart(5)}s] ${name}`);
};

const hosts = new Map();                     // real evidence for the offline card
const page = await ctx.newPage();
page.on("request", (r) => {
  const h = new URL(r.url()).host || "(inline)";
  hosts.set(h, (hosts.get(h) || 0) + 1);
});

// A visible pointer: Playwright's synthetic clicks are real, but invisible without this.
await page.addInitScript(() => {
  window.__cursor = () => {
    if (document.getElementById("__cur")) return;
    const c = document.createElement("div");
    c.id = "__cur";
    Object.assign(c.style, {
      position: "fixed", left: "0", top: "0", width: "24px", height: "24px",
      zIndex: "2147483647", pointerEvents: "none",
      transform: "translate(720px, 420px)",
      transition: "transform .55s cubic-bezier(.33,.1,.25,1)",
      filter: "drop-shadow(0 2px 4px rgba(0,0,0,.55))",
    });
    c.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24"><path d="M4 2 L4 19.5 L8.7 14.9 L12.2 22 L15.4 20.4 L11.9 13.6 L18.6 13.6 Z" fill="#fff" stroke="#111" stroke-width="1.1" stroke-linejoin="round"/></svg>`;
    document.body.appendChild(c);
  };
});

const pause = (ms) => page.waitForTimeout(ms);

async function pointAt(locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("cannot point at an element with no box");
  const x = Math.round(box.x + Math.min(box.width / 2, 90));
  const y = Math.round(box.y + box.height / 2);
  await page.evaluate(([x, y]) => {
    const c = document.getElementById("__cur");
    if (c) c.style.transform = `translate(${x}px, ${y}px)`;
  }, [x, y]);
  await pause(700);
}

async function clickIt(locator) {
  await pointAt(locator);
  await page.evaluate(() => {                       // a small press, so the click reads
    const c = document.getElementById("__cur");
    if (c) { c.style.transition = "transform .12s"; c.style.opacity = "0.55"; }
  });
  await locator.click();
  await page.evaluate(() => {
    const c = document.getElementById("__cur");
    if (c) { c.style.opacity = "1"; c.style.transition = "transform .55s cubic-bezier(.33,.1,.25,1)"; }
  });
}

const column = () => page.locator("section.min-h-0.overflow-y-auto").first();

// The compliance score, once it has finished counting up to an exact value.
const scoreReaches = (n) =>
  page.waitForFunction((want) => {
    const el = document.querySelector(".text-5xl");
    return !!el && el.textContent.trim() === String(want);
  }, n, { timeout: 30000 });
async function scrollTo(top, settle = 900) {
  await column().evaluate((el, t) => el.scrollTo({ top: t, behavior: "smooth" }), top);
  await pause(settle);
}

// ---------------------------------------------------------------- the take ---
await page.goto(APP, { waitUntil: "networkidle" });
await page.evaluate(() => window.__cursor());
mark("open");
await pause(2200);

// ACT 1 — a vendor it knows
await clickIt(page.getByText("Cisco IOS router (known vendor)"));
mark("act1.click");
await scoreReaches(52);
mark("act1.report");
await pause(5500);                                  // 52%, 2 high — let it land
await scrollTo(300, 1100);
mark("act1.findings");
await pause(4500);
await clickIt(page.getByRole("button", { name: /^Copy$/ }).first());
mark("act1.copyfix");
await pause(3000);
await scrollTo(0, 900);

// ACT 1b — the same device, hardened
await clickIt(page.getByText("Cisco IOS router (hardened)"));
mark("act1b.click");
await scoreReaches(100);
mark("act1b.report");
await pause(5500);

// ACT 2 — a vendor it has never seen; the local model reads it live
await clickIt(page.getByText("AcmeOS firewall (never seen before)"));
mark("act2.click");
await page.waitForSelector("text=/Reading a vendor it has never seen/", { timeout: 20000 });
mark("act2.learning");
await page.waitForSelector("text=/Teach a new vendor/", { timeout: 120000 });
mark("act2.proposals");
await pause(5000);
await scrollTo(420, 1400);
mark("act2.mappings");
await pause(5500);
await scrollTo(0, 900);

// ACT 3 — confirm, and it becomes a known vendor
await clickIt(page.getByRole("button", { name: /Teach & re-audit/i }));
mark("act3.click");
await page.waitForSelector("text=/Learned vendor/", { timeout: 60000 });
mark("act3.learned");
await pause(6500);                                  // the 5 ms badge is the whole point

// The offline PDF, actually downloaded
const [download] = await Promise.all([
  page.waitForEvent("download"),
  clickIt(page.getByRole("button", { name: /Export PDF/i })),
]);
await download.saveAs(`${OUT}/report.pdf`);
mark("pdf.saved");
await pause(2600);

const timing = await page.evaluate(() => document.body.innerText.match(/deterministic \(learned\).*?ms/s)?.[0] || "");
mark("end");

await ctx.close();
await browser.close();

writeFileSync("timeline.json", JSON.stringify({
  marks,
  hosts: [...hosts.entries()].map(([host, count]) => ({ host, count })),
  model: health.ollama.model,
  rules: health.rules,
  learnedBadge: timing,
}, null, 2));

console.log("\nhosts contacted during the whole take:");
for (const [h, n] of hosts) console.log(`  ${h}  ×${n}`);
console.log("\nwrote raw/*.webm + timeline.json");
