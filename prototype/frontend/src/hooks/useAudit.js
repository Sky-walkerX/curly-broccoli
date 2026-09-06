import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

// Single source of truth for the whole audit workflow + every UI state it can be in.
export function useAudit() {
  const [health, setHealth] = useState(null);      // null = still loading
  const [fixtures, setFixtures] = useState([]);
  const [config, setConfig] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");    // idle | loading | error
  const [error, setError] = useState("");
  const [teaching, setTeaching] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState("analyzing"); // analyzing | learning
  const [live, setLive] = useState({ lines: [], mappings: [], model: "" }); // streamed progress
  const timer = useRef(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth({ ok: false, ollama: { ok: false } }));
    api.fixtures().then((d) => setFixtures(d.fixtures || [])).catch(() => {});
    return () => clearInterval(timer.current);
  }, []);

  // The server decides which path a config takes, so it also tells us which phase we are
  // in -- the UI never has to guess from the filename the way it used to.
  const runAudit = useCallback(async (cfg, hint) => {
    const text = cfg ?? config;
    if (!text.trim()) return;
    setStatus("loading"); setError(""); setPhase("analyzing");
    setLive({ lines: [], mappings: [], model: "" });
    setElapsed(0); clearInterval(timer.current);
    timer.current = setInterval(() => setElapsed((e) => e + 1), 1000);

    let streamed = false, done = null;
    try {
      await api.auditStream(text, hint, (kind, data) => {
        streamed = true;
        if (kind === "learning") {
          setPhase("learning");
          setLive({ lines: data.lines || [], mappings: [], model: data.model || "" });
        } else if (kind === "mapping") {
          setLive((l) => ({ ...l, mappings: [...l.mappings, data] }));
        } else if (kind === "done") {
          done = data;
        } else if (kind === "failed") {
          throw new Error(data.message || "Audit failed");
        }
      });
      if (!done) throw new Error("Audit ended without a result");
      setResult(done); setStatus("idle");
    } catch (e) {
      // Streaming is a nicety; the plain endpoint is the source of truth. Only retry it
      // if the stream died before telling us anything, so we never audit twice.
      if (!streamed) {
        try {
          const r = await api.audit(text, hint);
          setResult(r); setStatus("idle");
          return;
        } catch (e2) { e = e2; }
      }
      setError(String(e.message || e)); setStatus("error"); setResult(null);
    } finally {
      clearInterval(timer.current);
    }
  }, [config]);

  const loadSample = useCallback(async (name) => {
    try {
      const { config: cfg } = await api.loadFixture(name);
      setConfig(cfg);
      runAudit(cfg, name.includes("acme") ? "acme_os" : undefined);
    } catch (e) { setError(String(e.message || e)); setStatus("error"); }
  }, [runAudit]);

  const teach = useCallback(async (vendor, mappings) => {
    setTeaching(true); setError("");
    try {
      await api.teach(vendor, mappings);
      const h = await api.health().catch(() => null); if (h) setHealth(h);
      await runAudit(config, undefined);
    } catch (e) { setError(String(e.message || e)); }
    finally { setTeaching(false); }
  }, [config, runAudit]);

  const exportPdf = useCallback(async () => {
    setExporting(true);
    try {
      await api.downloadPdf(config, result?.device?.vendor_status === "provisional" ? "provisional" : undefined);
    } catch (e) { setError(String(e.message || e)); }
    finally { setExporting(false); }
  }, [config, result]);

  return {
    health, fixtures, config, setConfig, result, status, error, teaching, exporting, elapsed, phase, live,
    runAudit, loadSample, teach, exportPdf,
  };
}
