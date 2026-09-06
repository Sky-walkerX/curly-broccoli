import { useState } from "react";
import { motion } from "framer-motion";
import { BrainCircuit, Loader2, GraduationCap, ArrowLeftRight, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const FIELD_LABEL = {
  hostname: "Hostname",
  "services.telnet_enabled": "Telnet enabled",
  "services.ssh_enabled": "SSH enabled",
  "services.ssh_version": "SSH version",
  "services.http_server": "HTTP server (plaintext)",
  "services.cdp_enabled": "Discovery protocol",
  "services.snmp_communities": "SNMP community",
  "auth.enable_secret": "Enable secret (hashed)",
  "auth.password_encryption": "Password encryption",
  "auth.aaa_new_model": "AAA enabled",
  "logging.enabled": "Logging",
  "logging.hosts": "Log host",
  "ntp.configured": "NTP configured",
  "ntp.servers": "NTP server",
  "vty.transport_input": "Admin transport",
  "vty.access_class": "Admin access ACL",
  "vty.exec_timeout": "Idle timeout",
  banner_login: "Login banner",
};
const AGREE = {
  agree: { variant: "pass", text: "confirmed ×2" },
  conflict: { variant: "warn", text: "engines differ" },
  llm_only: { variant: "primary", text: "model" },
  heuristic_only: { variant: "outline", text: "rule" },
};
function fmt(v) {
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (Array.isArray(v)) {
    if (v.length && typeof v[0] === "object") return v.map((c) => `${c.name} (${c.access})`).join(", ");
    return v.length ? v.join(", ") : "none";
  }
  return String(v);
}

function Row({ p, state, onToggle, onSwap, i }) {
  const a = AGREE[p.agreement] || AGREE.llm_only;
  const conflict = p.agreement === "conflict";
  const shown = state.chosen === "alt" ? p.alt_value : p.value;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * i, duration: 0.28 }}
      className={cn("flex items-start gap-3 rounded-lg border p-2.5 transition-colors",
        state.include ? "border-border bg-card-2" : "border-dashed border-border bg-transparent opacity-55")}
    >
      <label className="mt-0.5 cursor-pointer">
        <input type="checkbox" checked={state.include} onChange={onToggle}
          className="h-4 w-4 rounded accent-[var(--primary)]" />
      </label>
      <div className="min-w-0 flex-1">
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <div className="truncate font-mono text-[11.5px] text-faint">{p.line}</div>
          </TooltipTrigger>
          <TooltipContent className="max-w-md font-mono text-[11px]">{p.line}</TooltipContent>
        </Tooltip>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[13px] font-medium text-foreground">{FIELD_LABEL[p.field] || p.field}</span>
          <span className="text-faint">=</span>
          <span className="rounded bg-primary-soft px-1.5 py-0.5 font-mono text-[12px] text-primary">{fmt(shown)}</span>
          <Badge variant={a.variant}>{a.text}</Badge>
        </div>
        {conflict && (
          <button onClick={onSwap} className="mt-1 flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <ArrowLeftRight className="h-3 w-3" />
            {state.chosen === "alt" ? `use model value: ${fmt(p.value)}` : `cross-check suggests ${fmt(p.alt_value)} — use it`}
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function TeachPanel({ learning, onTeach, teaching }) {
  const props = learning.proposals || [];
  const [vendor, setVendor] = useState(learning.vendor_guess || "new-vendor");
  const [rows, setRows] = useState(() =>
    props.map((p) => ({ include: true, chosen: p.agreement === "conflict" ? "alt" : "value" }))
  );
  const setRow = (i, patch) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const included = rows.filter((r) => r.include).length;
  const conflicts = props.filter((p) => p.agreement === "conflict").length;

  const submit = () => {
    const mappings = props
      .map((p, i) => ({ p, r: rows[i] }))
      .filter(({ r }) => r.include)
      .map(({ p, r }) => ({
        line: p.line, field: p.field,
        value: r.chosen === "alt" ? p.alt_value : p.value,
        match_keywords: p.match_keywords, capture_regex: p.capture_regex || null,
      }));
    onTeach(vendor.trim().toLowerCase().replace(/\s+/g, "_"), mappings);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}
      className="overflow-hidden rounded-xl border border-primary/30 bg-card"
    >
      <div className="relative border-b border-border bg-primary-soft/40 p-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-70" />
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-primary/30 bg-primary-soft text-primary">
            <BrainCircuit className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold">Teach a new vendor</h2>
              <Badge variant={learning.llm_used ? "primary" : "outline"}>
                {learning.llm_used ? "local model proposed these" : "offline heuristic"}
              </Badge>
            </div>
            <p className="mt-0.5 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
              No parser exists for this device. The local model read a config it has never seen and mapped it to the
              security schema. Confirm the mappings to teach it — it becomes a known vendor with <span className="font-medium text-foreground">no code change</span>.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <label htmlFor="vendor-name" className="text-[13px] font-medium text-muted-foreground">Vendor name</label>
          <input id="vendor-name" value={vendor} onChange={(e) => setVendor(e.target.value)}
            className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 font-mono text-[13px] outline-none focus:border-border-strong focus-visible:ring-2 focus-visible:ring-ring" />
          {conflicts > 0 && <span className="text-xs text-warn">{conflicts} to review</span>}
        </div>

        <div className="scroll-thin flex max-h-[44vh] flex-col gap-1.5 overflow-y-auto pr-1">
          {props.map((p, i) => (
            <Row key={i} p={p} i={i} state={rows[i]}
              onToggle={() => setRow(i, { include: !rows[i].include })}
              onSwap={() => setRow(i, { chosen: rows[i].chosen === "alt" ? "value" : "alt" })} />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={submit} disabled={teaching || !included}>
            {teaching ? <><Loader2 className="animate-spin" /> Teaching…</> : <><GraduationCap /> Teach &amp; re-audit ({included})</>}
          </Button>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5" style={{ color: "var(--pass)" }} />
            Next time it parses deterministically — instantly, offline.
          </span>
        </div>
      </div>
    </motion.section>
  );
}
