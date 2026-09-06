import { Server, ShieldCheck, Sparkles, Play, Loader2, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";

const ICON = { "cisco-ios.cfg": Server, "cisco-ios-hardened.cfg": ShieldCheck, "acme-os.cfg": Sparkles };

function SampleButton({ f, onClick, disabled }) {
  const Icon = ICON[f.name] || Server;
  return (
    <button onClick={onClick} disabled={disabled}
      className="group flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-border-strong hover:bg-card-2 disabled:opacity-50 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-ring outline-none">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-surface-2 text-muted-foreground transition-colors group-hover:text-primary group-hover:border-primary/40">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium leading-tight">{f.label}</span>
        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{f.note}</span>
      </span>
    </button>
  );
}

export function ConfigPane({ fixtures, config, setConfig, onAudit, loading, onSample }) {
  const lines = config ? config.split("\n").length : 0;
  return (
    <div className="flex min-h-0 flex-col gap-4">
      <section>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">Sample devices</h2>
        <div className="flex flex-col gap-2">
          {fixtures.map((f) => <SampleButton key={f.name} f={f} disabled={loading} onClick={() => onSample(f.name)} />)}
        </div>
      </section>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">Device configuration</h2>
          {config && (
            <button onClick={() => setConfig("")} disabled={loading}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">
              <Eraser className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface-2 focus-within:border-border-strong">
          <textarea
            id="device-config"
            value={config}
            onChange={(e) => setConfig(e.target.value)}
            spellCheck={false}
            placeholder="Paste a router / firewall running-config, or load a sample above…"
            className="scroll-thin min-h-[220px] flex-1 resize-none bg-transparent p-3.5 font-mono text-[12.5px] leading-relaxed text-foreground outline-none placeholder:text-faint"
          />
          <div className="flex items-center justify-between border-t border-border bg-card/40 px-3 py-1.5 text-[11px] text-faint">
            <span className="tabular">{lines} lines · {config.length} chars</span>
            <span>running-config</span>
          </div>
        </div>
      </section>

      <Button size="lg" onClick={onAudit} disabled={loading || !config.trim()} className="w-full">
        {loading ? <><Loader2 className="animate-spin" /> Analyzing…</> : <><Play /> Audit configuration</>}
      </Button>
    </div>
  );
}
