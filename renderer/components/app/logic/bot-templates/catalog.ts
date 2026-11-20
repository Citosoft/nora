import { roleProfiles } from "@shared/personalization/profiles";
import type { BotTemplate, BotTemplateSuggestions } from "@shared/types/bots/bots.types";
import type { TemplateFilters } from "@/components/app/types/botTemplates.types";

export const TEMPLATE_ROLES = roleProfiles.filter((profile) => profile.id !== "custom");

export function templateRoleLabels(template: BotTemplate): string[] {
  return TEMPLATE_ROLES.filter((profile) => template.roles.some((role) => role === profile.id)).map((profile) => profile.label);
}

/** Keep suggested templates first while matching every search term across the complete brief. */
export function filterTemplates(templates: BotTemplateSuggestions, filters: TemplateFilters): readonly BotTemplate[] {
  const terms = filters.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const candidates = filters.suggestedOnly ? templates.suggested : [...templates.suggested, ...templates.more];
  return candidates.filter((template) => {
    if (filters.role !== "all" && !template.roles.includes(filters.role)) return false;
    const text = [template.name, template.role, template.summary, template.instructions, ...templateRoleLabels(template)].join(" ").toLocaleLowerCase();
    return terms.every((term) => text.includes(term));
  });
}

/** A filter never leaves the detail pane showing a hidden template. */
export function selectedTemplate(templates: readonly BotTemplate[], selectedId: string | null): BotTemplate | null {
  return templates.find((template) => template.id === selectedId) ?? templates[0] ?? null;
}
