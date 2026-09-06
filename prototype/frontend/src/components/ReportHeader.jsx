import { motion } from "framer-motion";
import { Download, Loader2, ShieldCheck, ShieldQuestion, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCountUp } from "@/hooks/useCountUp";

const VENDOR = {
  known: { variant: "pass", icon: ShieldCheck, text: "Known vendor" },
  learned: { variant: "primary", icon: GraduationCap, text: "Learned vendor" },
  provisional: { variant: "warn", icon: ShieldQuestion, text: "Unrecognized — provisional" },
};
const SEV_RANK = { high: 0, medium: 1, low: 2 };
const STATUS_ORDER = { fail: 0, na: 1, pass: 2 };
const SEG_COLOR = { fail: "var(--fail)", pass: "var(--pass)", na: "var(--faint)" };

export function DeviceIdentity({ device, onExport, exporting, canExport }) {
  const v = VENDOR[device.vendor_status] || VENDOR.provisional;
  const Icon = v.icon;
  const d = device.detect;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight">{device.hostname || "Unnamed device"}</h1>
        <span className="font-mono text-[13px] text-muted-foreground">{device.vendor}</span>
        <Badge variant={v.variant}><Icon className="h-3.5 w-3.5" />{v.text}</Badge>
        {d && (
          <span className="text-xs text-faint tabular">
            match {d.learned > 0 ? `learned ${Math.round(d.learned * 100)}%` : `cisco ${Math.round(d.cisco * 100)}%`}
          </span>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={onExport} disabled={exporting || !canExport}>
        {exporting ? <Loader2 className="animate-spin" /> : <Download />} Export PDF
      </Button>
    </div>
  );
}

function Stat({ n, label, color }) {
  return (
    <div className="flex flex-col">
      <span className="tabular text-2xl font-semibold leading-none" style={{ color }}>{n}</span>
      <span className="mt-1 text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

export function PostureSummary({ report }) {
  const score = useCountUp(report.score);
  const tone = report.score >= 80 ? "var(--pass)" : report.score >= 55 ? "var(--warn)" : "var(--fail)";
  const fbs = report.fails_by_severity;
  const segs = [...report.checks].sort(
    (a, b) => (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) ||
              (SEV_RANK[a.severity] - SEV_RANK[b.severity])
  );
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-5 rounded-xl border border-border bg-card p-5">
      <div className="flex items-baseline gap-1">
        <span className="tabular text-5xl font-semibold leading-none" style={{ color: tone }}>{score}</span>
        <span className="text-xl font-medium" style={{ color: tone }}>%</span>
        <span className="ml-2 self-end pb-1 text-xs text-muted-foreground">compliant</span>
      </div>

      <div className="min-w-[240px] flex-1">
        <div className="mb-2 flex items-center gap-1" role="img" aria-label={`${report.passed} pass, ${report.failed} fail, ${report.na} not assessed`}>
          {segs.map((c, i) => (
            <Tooltip key={c.id} delayDuration={80}>
              <TooltipTrigger asChild>
                <motion.span
                  initial={{ scaleY: 0.2, opacity: 0 }}
                  animate={{ scaleY: 1, opacity: 1 }}
                  transition={{ delay: 0.15 + i * 0.03, duration: 0.3, ease: "easeOut" }}
                  className="h-2.5 flex-1 rounded-[3px] origin-bottom"
                  style={{ background: SEG_COLOR[c.status] }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <span className="font-medium">{c.title}</span> — {c.status.toUpperCase()}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-faint">
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: "var(--pass)" }} />pass</span>
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: "var(--fail)" }} />fail</span>
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: "var(--faint)" }} />n/a</span>
          <span className="ml-auto">{report.total} checks</span>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <Stat n={report.passed} label="Passed" color="var(--pass)" />
        <Stat n={report.failed} label="Failed" color="var(--fail)" />
        <Stat n={report.na} label="Not assessed" color="var(--muted-foreground)" />
      </div>

      {report.failed > 0 && (
        <div className="flex items-center gap-1.5">
          {fbs.high > 0 && <Badge variant="fail">{fbs.high} high</Badge>}
          {fbs.medium > 0 && <Badge variant="warn">{fbs.medium} med</Badge>}
          {fbs.low > 0 && <Badge variant="outline">{fbs.low} low</Badge>}
        </div>
      )}
    </div>
  );
}
