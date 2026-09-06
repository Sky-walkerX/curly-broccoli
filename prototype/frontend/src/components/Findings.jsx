import { useState } from "react";
import { motion } from "framer-motion";
import { CircleCheck, CircleX, MinusCircle, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ST = {
  pass: { icon: CircleCheck, color: "var(--pass)", label: "PASS" },
  fail: { icon: CircleX, color: "var(--fail)", label: "FAIL" },
  na:   { icon: MinusCircle, color: "var(--faint)", label: "N/A" },
};
const SEV_VARIANT = { high: "fail", medium: "warn", low: "outline" };
const RANK = { high: 0, medium: 1, low: 2 };

function CopyFix({ text }) {
  const [done, setDone] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(text).then(() => {
      setDone(true); toast.success("Fix copied to clipboard");
      setTimeout(() => setDone(false), 1400);
    }).catch(() => toast.error("Couldn't copy"));
  };
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-border bg-surface-2">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-faint">Remediation</span>
        <button onClick={copy} className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary">
          {done ? <><Check className="h-3.5 w-3.5" style={{ color: "var(--pass)" }} /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
        </button>
      </div>
      <pre className="scroll-thin overflow-x-auto p-3 font-mono text-[12.5px] leading-relaxed text-foreground/90">{text}</pre>
    </div>
  );
}

function FindingCard({ c, i }) {
  const s = ST[c.status];
  const Icon = s.icon;
  const failed = c.status === "fail";
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + i * 0.05, duration: 0.35, ease: "easeOut" }}
      className={cn("rounded-xl border bg-card p-4 transition-colors", failed ? "border-fail/25" : "border-border hover:border-border-strong")}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0" style={{ color: s.color }} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold" style={{ color: s.color }}>{s.label}</span>
            <Badge variant={SEV_VARIANT[c.severity]} className="uppercase">{c.severity}</Badge>
            <h3 className="text-[15px] font-medium leading-tight text-foreground">{c.title}</h3>
            <span className="ml-auto shrink-0 font-mono text-[11px] text-faint">{c.id}</span>
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{c.detail}</p>
          {failed && c.rationale && (
            <p className="mt-1 text-[13px] leading-relaxed text-faint">
              <span className="font-medium text-muted-foreground">Why it matters. </span>{c.rationale}
            </p>
          )}
          {failed && c.fix && <CopyFix text={c.fix} />}
          {c.reference && <p className="mt-2.5 font-mono text-[11px] text-faint">{c.reference}</p>}
        </div>
      </div>
    </motion.article>
  );
}

export function Findings({ checks }) {
  const sorted = [...checks].sort(
    (a, b) => (a.status !== "fail") - (b.status !== "fail") || RANK[a.severity] - RANK[b.severity]
  );
  return (
    <div className="flex flex-col gap-2.5">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
        Findings · {sorted.length} checks
      </h2>
      {sorted.map((c, i) => <FindingCard key={c.id} c={c} i={i} />)}
    </div>
  );
}
