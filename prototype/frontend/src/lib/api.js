// Thin API client. Same-origin relative URLs; Vite proxies /api -> :8099 in dev.
async function get(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error((await r.text()) || r.statusText);
  return r.json();
}
async function post(path, body) {
  const r = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error((await r.text()) || r.statusText);
  return r.json();
}

export const api = {
  health: () => get("/api/health"),
  fixtures: () => get("/api/fixtures"),
  loadFixture: (name) => get(`/api/fixtures/${name}`),
  audit: (config, vendor_hint) => post("/api/audit", { config, vendor_hint }),
  teach: (vendor, mappings) => post("/api/teach", { vendor, mappings }),
  async downloadPdf(config, vendor_hint) {
    const r = await fetch("/api/report/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config, vendor_hint }),
    });
    if (!r.ok) throw new Error("PDF export failed");
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: "compliance-report.pdf" });
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  },
};
