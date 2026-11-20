import { ChevronRight } from "lucide-react";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { cn } from "@/lib/utils";
import type { BotTemplateRowProps } from "@/components/app/types/botTemplates.types";

export function BotTemplateRow({ template, selected, suggested, onSelect }: BotTemplateRowProps) {
  return <li><button type="button" onClick={onSelect} aria-pressed={selected} aria-controls="bot-template-detail"
    aria-label={`View ${template.role} template details`}
    className={cn("flex w-full items-start gap-3 rounded-md p-3 text-left transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", selected && "bg-muted")}>
    <BotAvatar avatar={{ seed: 0, ...template.avatar }} size={36} />
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-medium">{template.role}</span>
      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{template.summary}</span>
      {suggested && <span className="mt-1.5 block text-xs text-primary">Suggested for you</span>}
    </span>
    <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
  </button></li>;
}
