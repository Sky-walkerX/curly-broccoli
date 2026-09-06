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
  const timer = useRef(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth({ ok: false, ollama: { ok: false } }));
    api.fixtures().then((d) => setFixtures(d.fixtures || [])).catch(() => {});
    return () => clearInterval(timer.current);
  }, []);

  const runAudit = useCallback(async (cfg, hint, expectLearn = false) => {
    const text = cfg ?? config;
    if (!text.trim()) return;
    setStatus("loading"); setError(""); setPhase(expectLearn ? "learning" : "analyzing");
    setElapsed(0); clearInterval(timer.current);
    timer.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    try {
      const r = await api.audit(text, hint);
      setResult(r); setStatus("idle");
    } catch (e) {
      setError(String(e.message || e)); setStatus("error"); setResult(null);
    } finally {
      clearInterval(timer.current);
    }
  }, [config]);

  const loadSample = useCallback(async (name) => {
    try {
      const { config: cfg } = await api.loadFixture(name);
      setConfig(cfg);
      const acme = name.includes("acme");
      runAudit(cfg, acme ? "acme_os" : undefined, acme);
    } catch (e) { setError(String(e.message || e)); setStatus("error"); }
  }, [runAudit]);

  const teach = useCallback(async (vendor, mappings) => {
    setTeaching(true); setError("");
    try {
      await api.teach(vendor, mappings);
      const h = await api.health().catch(() => null); if (h) setHealth(h);
      await runAudit(config, undefined, false);
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
    health, fixtures, config, setConfig, result, status, error, teaching, exporting, elapsed, phase,
    runAudit, loadSample, teach, exportPdf,
  };
}
