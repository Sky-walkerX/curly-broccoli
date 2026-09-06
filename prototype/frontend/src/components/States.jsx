import { AnimatePresence, motion } from "framer-motion";
import { ScanSearch, TriangleAlert, RotateCcw, Sparkles, Cpu, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { FIELD_LABEL, fmtValue } from "@/lib/fields";

export function EmptyState() {
  return (
    <div className="grid h-full min-h-[420px] place-items-center">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-border bg-card text-muted-foreground">
          <ScanSearch className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-semibold">Audit a device configuration</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Load a sample or paste a running-config, then run the audit to get a CIS/NIST/STIG posture with copy-paste fixes.
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Try <span className="font-medium text-foreground">AcmeOS</span> to watch it learn a new vendor live
        </p>
      </div>
    </div>
  );
}

function LiveLine({ line, mapping }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className={cn("rounded-lg border px-3 py-2 transition-colors",
        mapping ? "border-primary/25 bg-primary-soft/20" : "border-dashed border-border opacity-45")}
    >
      <div className="truncate font-mono text-[12px] text-faint">{line}</div>
      <AnimatePresence>
        {mapping && (
          <motion.div
            initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }}
            className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1"
          >
            <Check className="h-3.5 w-3.5" style={{ color: "var(--pass)" }} />
            <span className="text-[13px] font-medium">{FIELD_LABEL[mapping.field] || mapping.field}</span>
            <span className="text-faint">=</span>
            <span className="rounded bg-primary-soft px-1.5 py-0.5 font-mono text-[12px] text-primary">
              {fmtValue(mapping.value)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function LoadingState({ phase, elapsed, live }) {
  const learning = phase === "learning";

  // Every line below came off the wire from the local model as it wrote its answer --
  // nothing here is simulated progress.
  if (learning && live?.lines?.length) {
    const byLine = new Map();
    for (const m of live.mappings) if (!byLine.has(m.line)) byLine.set(m.line, m);
    const mapped = byLine.size;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-card px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary-soft text-primary">
            <Cpu className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">Reading a vendor it has never seen</div>
            <div className="text-xs text-muted-foreground">
              <span className="font-mono">{live.model}</span> running locally · mapping config lines to the
              security schema
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="tabular text-lg font-semibold leading-none text-primary">{mapped}<span className="text-muted-foreground">/{live.lines.length}</span></div>
            <div className="mt-1 text-[11px] text-muted-foreground tabular">{elapsed}s</div>
          </div>
        </div>

        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <motion.div className="h-full rounded-full bg-primary"
            animate={{ width: `${Math.round((mapped / live.lines.length) * 100)}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }} />
        </div>

        <div className="flex flex-col gap-1.5">
          {live.lines.map((l) => <LiveLine key={l} line={l} mapping={byLine.get(l)} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-primary-soft text-primary">
          <Cpu className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">
            {learning ? "Reading an unfamiliar vendor with the local model…" : "Analyzing configuration…"}
          </div>
          <div className="text-xs text-muted-foreground">
            {learning
              ? `Mapping config lines to the security schema${elapsed >= 2 ? ` · ${elapsed}s` : ""}`
              : "Deterministic parse + rule evaluation"}
          </div>
        </div>
      </div>
      {/* indeterminate progress shimmer */}
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <motion.div className="h-full w-1/3 rounded-full bg-primary"
          animate={{ x: ["-120%", "360%"] }} transition={{ repeat: Infinity, duration: 1.3, ease: "easeInOut" }} />
      </div>
      <Skeleton className="h-[104px] w-full rounded-xl" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-14" /><Skeleton className="h-4 w-12" /><Skeleton className="h-4 w-52" />
          </div>
          <Skeleton className="mt-3 h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="grid h-full min-h-[360px] place-items-center">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-fail/30 bg-fail-soft text-fail">
          <TriangleAlert className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-semibold">Audit failed</h2>
        <p className="mt-1.5 break-words font-mono text-[13px] text-muted-foreground">{message}</p>
        {onRetry && <Button variant="outline" className="mt-4" onClick={onRetry}><RotateCcw /> Retry</Button>}
      </div>
    </div>
  );
}
