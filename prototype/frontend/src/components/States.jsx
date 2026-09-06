import { motion } from "framer-motion";
import { ScanSearch, TriangleAlert, RotateCcw, Sparkles, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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

export function LoadingState({ phase, elapsed }) {
  const learning = phase === "learning";
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
