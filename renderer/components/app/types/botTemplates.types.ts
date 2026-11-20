import type { Connector } from "@shared/types/connectors/connectors.types";
import type { BotTemplate, BotTemplateSuggestions } from "@shared/types/bots/bots.types";
import type { RoleId } from "@shared/types/personalization/roles.types";

export type TemplateRoleFilter = Exclude<RoleId, "custom"> | "all";
export interface TemplateFilters {
  query: string;
  role: TemplateRoleFilter;
  suggestedOnly: boolean;
}
export interface BotTemplateCatalogProps {
  templates: BotTemplateSuggestions;
  templateRole: string | null;
  onUse(template: BotTemplate): void;
}
export interface TemplateFiltersProps {
  filters: TemplateFilters;
  templateRole: string | null;
  onChange(filters: TemplateFilters): void;
}
export interface BotTemplateRowProps {
  template: BotTemplate;
  selected: boolean;
  suggested: boolean;
  onSelect(): void;
}
export interface BotTemplateDetailProps {
  connectors: readonly Connector[] | null;
  template: BotTemplate;
  onUse(template: BotTemplate): void;
}
