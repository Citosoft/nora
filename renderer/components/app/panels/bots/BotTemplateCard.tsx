import { BotAvatar } from "@/components/app/shared/BotAvatar";
import type { BotTemplateCardProps } from "@/components/app/types/botNavigation.types";

/** A whole-card button: picking a template opens the editor prefilled, where the model is chosen before saving. */
export function BotTemplateCard({ template, onUse }: BotTemplateCardProps) {
  return <li><button type="button" onClick={onUse} aria-label={`Create a bot from the ${template.role} template`}
    className="flex h-full w-full items-start gap-3 rounded-lg border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <BotAvatar avatar={{ seed: 0, ...template.avatar }} size={44} />
    <span className="min-w-0 flex-1"><span className="block font-medium">{template.role}</span>
      <span className="mt-0.5 block text-sm text-muted-foreground">{template.summary}</span></span>
  </button></li>;
}
