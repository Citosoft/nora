import { Brain, Signal, SignalHigh, SignalLow, SignalMedium, SignalZero, type LucideIcon } from "lucide-react";
import type { ProviderModel } from "@shared/types/provider/catalog.types";
import type { ComposerSettingChoice } from "@/components/app/types/modelPicker.types";

/** The choice id that keeps the provider's own configured effort; the binding stores it as null. */
export const PROVIDER_REASONING = "";

/** Levels Claude, Codex and common ACP agents report; any other level is still listed under its own name. */
const knownEfforts: Readonly<Record<string, { label: string; description: string; icon: LucideIcon }>> = {
  none: { label: "None", description: "Answers straight away without extended thinking.", icon: SignalZero },
  minimal: { label: "Minimal", description: "Thinks as little as possible for the fastest replies.", icon: SignalZero },
  low: { label: "Low", description: "Thinks briefly. Faster and uses fewer tokens.", icon: SignalLow },
  medium: { label: "Medium", description: "Balances speed with depth for everyday work.", icon: SignalMedium },
  high: { label: "High", description: "Thinks more deeply about complex changes.", icon: SignalHigh },
  xhigh: { label: "Extra high", description: "Thinks longer on hard problems. Slower and uses more tokens.", icon: Signal },
  max: { label: "Max", description: "Uses the most thinking available. Slowest and most thorough.", icon: Signal }
};

function effortChoice(effort: string): ComposerSettingChoice {
  const known = knownEfforts[effort.toLowerCase()];
  return known ? { id: effort, ...known } : { id: effort, label: effort.charAt(0).toUpperCase() + effort.slice(1), icon: Brain };
}

/** Reasoning choices for a model that exposes them, led by the provider default; empty when the model has none. */
export function reasoningChoices(model: ProviderModel | null): ComposerSettingChoice[] {
  if (!model?.reasoningEfforts.length) return [];
  const fallback = model.defaultReasoningEffort ? effortChoice(model.defaultReasoningEffort).label.toLowerCase() : null;
  return [{ id: PROVIDER_REASONING, label: "Default", icon: Brain,
    description: fallback ? `Uses the provider's configured effort, ${fallback} unless you've changed it.` : "Uses the effort configured in the provider." },
  ...model.reasoningEfforts.map(effortChoice)];
}
