import type { OnboardingSkillStepProps } from "@/components/app/types/onboardingSkill.types";
import { Button } from "@/components/ui/button";
import { CheckCircle2, LoaderCircle, ScrollText } from "lucide-react";

export function OnboardingSkillStep({ installed, available, state, onInstall }: OnboardingSkillStepProps) {
  return (
    <section className="rounded-lg border border-border/70 bg-card p-5" aria-label="Install the Nora skill">
      <ScrollText className="mb-3 size-6 text-muted-foreground" aria-hidden="true" />
      <h3 className="text-base font-medium text-foreground">Would you like to install the Nora skill?</h3>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        The skill teaches your agents how to work with Nora: read task details, start and finish tasks, and manage bots, threads and settings using Nora’s tools.
        It’s installed globally for supported agents and can be removed from Settings → Skills.
      </p>
      {installed ? (
        <p role="status" className="mt-4 flex items-center gap-2 text-sm text-foreground">
          <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
          The Nora skill is installed. You’re ready to continue.
        </p>
      ) : (
        <>
          <Button className="mt-4" disabled={!available || state.kind === "installing"} onClick={onInstall}>
            {state.kind === "installing" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
            {state.kind === "installing" ? "Installing Nora skill…" : state.kind === "error" ? "Retry installation" : "Install Nora skill"}
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            {available ? "Optional. Choose Skip for now to continue, and install it later from Settings → Skills." : "Skill installation isn’t available yet. Continue setup and install it later from Settings → Skills."}
          </p>
        </>
      )}
      {!installed && state.kind === "error" ? <p role="alert" className="mt-3 text-sm text-destructive">{state.message}</p> : null}
    </section>
  );
}
