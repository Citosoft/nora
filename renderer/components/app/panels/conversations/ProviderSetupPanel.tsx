import { useId } from "react";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProviderSetup } from "@/components/app/hooks/useProviderSetup";
import type { ProviderSetupPanelProps, ProviderSetupStep, ProviderSetupStepId, ProviderSetupStepMarkerProps } from "@/components/app/types/providerSetup.types";

const STEP_COPY: Record<ProviderSetupStepId, { title: string; detail: string }> = {
  install: { title: "Install a coding agent", detail: "Claude Code, Codex, Cursor or another ACP agent." },
  connect: { title: "Nora connects it", detail: "This happens automatically once the agent is detected. Press Check again if it doesn't." },
  "sign-in": { title: "Sign in", detail: "Use Sign in next to the agent in Settings → Providers." }
};

const STATE_LABEL: Record<ProviderSetupStep["state"], string> = { done: "done", current: "to do", pending: "to do", checking: "checking" };

function StepMarker({ step, index }: ProviderSetupStepMarkerProps) {
  const base = "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs";
  if (step.state === "done") return <span className={cn(base, "border-primary bg-primary text-primary-foreground")}><Check className="size-3.5" aria-hidden="true" /></span>;
  if (step.state === "checking") return <span className={cn(base, "border-primary text-primary")}><LoaderCircle className="size-3.5 motion-safe:animate-spin" aria-hidden="true" /></span>;
  return <span className={cn(base, step.state === "current" ? "border-foreground/40 text-foreground" : "border-border text-muted-foreground")} aria-hidden="true">{index + 1}</span>;
}

/** Stands in for the composer while no provider runtime is registered, guiding the user through setting one up. */
export function ProviderSetupPanel({ setup, visible, translucent }: ProviderSetupPanelProps) {
  const { steps, checking, checkAgain, openProviderSettings } = useProviderSetup(setup, visible);
  const headingId = useId();
  return <section aria-labelledby={headingId} className={cn("space-y-4 rounded-lg border p-4 shadow-sm", translucent ? "bg-card/80 backdrop-blur-sm" : "bg-card")}>
    <header className="space-y-1">
      <h2 id={headingId} className="text-sm font-medium">Get a provider ready</h2>
      <p className="text-sm text-muted-foreground">Nora runs threads through a coding agent installed on this machine.</p>
    </header>
    <ol aria-label="Provider setup steps" className="space-y-3">
      {steps.map((step, index) => <li key={step.id} className="flex items-start gap-3">
        <StepMarker step={step} index={index} />
        <span className="min-w-0 text-sm">
          <span className={cn("block", step.state === "done" ? "text-muted-foreground line-through decoration-muted-foreground/50" : step.state === "pending" ? "text-muted-foreground" : "text-foreground")}>
            {STEP_COPY[step.id].title}<span className="sr-only"> ({STATE_LABEL[step.state]})</span>
          </span>
          <span className="block text-xs text-muted-foreground">{STEP_COPY[step.id].detail}</span>
        </span>
      </li>)}
    </ol>
    <footer className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
      <p role="status" className="mr-auto text-xs text-muted-foreground">{checking ? "Checking for agents…" : "Nora checks again when you come back."}</p>
      <Button type="button" size="sm" variant="ghost" className="text-[11.5px] text-muted-foreground" disabled={checking} onClick={checkAgain}>Check again</Button>
      {openProviderSettings && <Button type="button" size="sm" onClick={openProviderSettings}>Open Providers<ArrowRight className="size-3.5" aria-hidden="true" /></Button>}
    </footer>
  </section>;
}
