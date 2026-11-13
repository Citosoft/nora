import { BotTemplateCard } from "./BotTemplateCard";
import type { BotTemplateSectionProps } from "@/components/app/types/botNavigation.types";

export function BotTemplateSection({ id, title, description, templates, onUse }: BotTemplateSectionProps) {
  if (!templates.length) return null;
  return <section aria-labelledby={id} className="space-y-3">
    <div><h2 id={id} className="text-sm font-medium">{title}</h2>{description && <p className="text-sm text-muted-foreground">{description}</p>}</div>
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{templates.map((template) => <BotTemplateCard key={template.id} template={template} onUse={() => onUse(template)} />)}</ul>
  </section>;
}
