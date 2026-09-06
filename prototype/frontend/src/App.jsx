import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { useAudit } from "@/hooks/useAudit";
import { TopBar } from "@/components/TopBar";
import { ConfigPane } from "@/components/ConfigPane";
import { DeviceIdentity, PostureSummary } from "@/components/ReportHeader";
import { Findings } from "@/components/Findings";
import { TeachPanel } from "@/components/TeachPanel";
import { EmptyState, LoadingState, ErrorState } from "@/components/States";

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.25, ease: "easeOut" },
};

export default function App() {
  const a = useAudit();
  const lastErr = useRef("");

  // Transient failures (teach / PDF export) surface as a toast; audit failures get the full ErrorState.
  useEffect(() => {
    if (a.error && a.error !== lastErr.current && a.status !== "error") toast.error(a.error);
    lastErr.current = a.error;
  }, [a.error, a.status]);

  const needsTeach = a.result?.learning?.needed;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full flex-col bg-background">
        <TopBar health={a.health} />
        <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[400px_1fr]">
          <aside className="flex min-h-0 flex-col overflow-y-auto scroll-thin border-b border-border bg-surface-2 p-4 lg:border-b-0 lg:border-r">
            <ConfigPane
              fixtures={a.fixtures} config={a.config} setConfig={a.setConfig}
              onAudit={() => a.runAudit()} loading={a.status === "loading"} onSample={a.loadSample}
            />
          </aside>

          <section className="min-h-0 overflow-y-auto scroll-thin p-5">
            <div className="mx-auto max-w-4xl">
              <AnimatePresence mode="wait">
                {a.status === "loading" ? (
                  <motion.div key="loading" {...fade}><LoadingState phase={a.phase} elapsed={a.elapsed} /></motion.div>
                ) : a.status === "error" ? (
                  <motion.div key="error" {...fade}><ErrorState message={a.error} onRetry={() => a.runAudit()} /></motion.div>
                ) : a.result ? (
                  <motion.div key="result" {...fade} className="flex flex-col gap-4">
                    <DeviceIdentity device={a.result.device} onExport={a.exportPdf} exporting={a.exporting} canExport={!!a.config.trim()} />
                    <PostureSummary report={a.result.report} />
                    {needsTeach && <TeachPanel learning={a.result.learning} onTeach={a.teach} teaching={a.teaching} />}
                    <Findings checks={a.result.report.checks} />
                  </motion.div>
                ) : (
                  <motion.div key="empty" {...fade} className="h-full"><EmptyState /></motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </main>
        <Toaster />
      </div>
    </TooltipProvider>
  );
}
