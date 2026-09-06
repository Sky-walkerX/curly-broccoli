import { ShieldCheck, Cpu, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ThemeToggle";

function StatusDot({ ok }) {
  return (
    <span className="relative flex h-2 w-2">
      {ok && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pass opacity-60" />}
      <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: ok ? "var(--pass)" : "var(--warn)" }} />
    </span>
  );
}

export function TopBar({ health }) {
  const oll = health?.ollama;
  const modelOk = oll?.ok && oll?.model_available;
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background/85 px-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-primary-soft text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
            Compliance Auditor
            <span className="hidden rounded border border-border px-1.5 py-px text-[10px] font-medium uppercase tracking-wider text-faint sm:inline">
              multi-vendor
            </span>
          </div>
          <div className="text-xs text-muted-foreground">Config in, CIS/NIST/STIG posture out.</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!health ? (
          <Skeleton className="h-7 w-56" />
        ) : (
          <div className="hidden items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 md:flex">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1.5 text-xs font-medium text-pass">
                  <Lock className="h-3.5 w-3.5" /> Air-gapped
                </span>
              </TooltipTrigger>
              <TooltipContent>No config data leaves this machine — no cloud calls.</TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="h-4" />
            <span className="tabular text-xs text-muted-foreground">{health.rules} rules</span>
            <Separator orientation="vertical" className="h-4" />
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <StatusDot ok={modelOk} />
                  <Cpu className="h-3.5 w-3.5" />
                  <span className="font-mono">{oll?.model || "no model"}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {modelOk ? "Local model reachable for unknown vendors" : "Model unavailable — learning falls back to the offline heuristic"}
              </TooltipContent>
            </Tooltip>
          </div>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
