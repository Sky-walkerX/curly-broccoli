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

  // Streaming twin of audit(). Calls onEvent(kind, data) as the server reports progress:
  // parsing | learning | mapping | done | failed. Unknown vendors take as long as the
  // local model takes, so we show that work instead of hiding it behind a spinner.
  async auditStream(config, vendor_hint, onEvent) {
    const r = await fetch("/api/audit/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config, vendor_hint }),
    });
    if (!r.ok || !r.body) throw new Error((await r.text().catch(() => "")) || r.statusText);
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let split;
      while ((split = buf.indexOf("\n\n")) !== -1) {
        const frame = buf.slice(0, split);
        buf = buf.slice(split + 2);
        let kind = "message", data = "";
        for (const line of frame.split("\n")) {
          if (line.startsWith("event: ")) kind = line.slice(7).trim();
          else if (line.startsWith("data: ")) data += line.slice(6);
        }
        if (data) onEvent(kind, JSON.parse(data));
      }
    }
  },
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
