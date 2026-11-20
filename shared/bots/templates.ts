import type { BotTemplate, BotTemplateSuggestions } from "@shared/types/bots/bots.types";
import type { RoleSelection } from "@shared/types/personalization/roles.types";

import { CORE_TEMPLATES } from "./templates/core";
import { ENGINEERING_TEMPLATES } from "./templates/engineering";
import { PRODUCT_TEMPLATES } from "./templates/product";
import { BUSINESS_TEMPLATES } from "./templates/business";
import { COMMUNICATION_TEMPLATES } from "./templates/communication";

/** Stable catalog order keeps existing suggestions first as new responsibilities are added. */
export const BOT_TEMPLATES: readonly BotTemplate[] = [
  ...CORE_TEMPLATES,
  ...ENGINEERING_TEMPLATES,
  ...PRODUCT_TEMPLATES,
  ...BUSINESS_TEMPLATES,
  ...COMMUNICATION_TEMPLATES
];

/**
 * Templates tagged for the user's role come first, in catalog order; the rest stay available. A custom role uses General's suggestions,
 * and no role suggests nothing so every template is listed once.
 */
export function templatesForRole(role: RoleSelection | null): BotTemplateSuggestions {
  if (!role) return { suggested: [], more: BOT_TEMPLATES };
  const id = role.id === "custom" ? "general" : role.id;
  return { suggested: BOT_TEMPLATES.filter((template) => template.roles.includes(id)), more: BOT_TEMPLATES.filter((template) => !template.roles.includes(id)) };
}
