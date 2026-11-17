import { botDefinitionSchema } from "@shared/bots/contracts";
import { newBotId } from "@shared/bots/catalog";
import type { BotDefinition, BotScope, BotTemplate } from "@shared/types/bots/bots.types";
import type { ThreadModelDefault } from "@shared/types/personalization/threadModel.types";
import type { BotEditorDraft, BotEditorResult } from "@/components/app/types/botEditor.types";

const FIELD_LABELS: Readonly<Record<string, string>> = { name: "Name", role: "Role", instructions: "Instructions", binding: "Model", avatar: "Avatar", scope: "Where it's available" };

export function newBotEditorDraft(scope: BotScope, model: ThreadModelDefault | null, seed: number): BotEditorDraft {
  return { name: "", role: "", instructions: "", model, avatar: { seed }, scope };
}

/** A new bot prefilled from a template; the template's face is pinned, the seed still varies for future rerolls. */
export function templateEditorDraft(template: BotTemplate, scope: BotScope, model: ThreadModelDefault | null, seed: number): BotEditorDraft {
  return { name: template.name, role: template.role, instructions: template.instructions, model, scope, avatar: { seed, ...template.avatar } };
}

export function botEditorDraft(bot: BotDefinition): BotEditorDraft {
  return { name: bot.name, role: bot.role, instructions: bot.instructions, avatar: bot.avatar, scope: bot.scope,
    model: { kind: bot.binding.kind, instanceId: bot.binding.instanceId, model: bot.binding.model } };
}

/** Builds the definition to save; the main process assigns the revision. Reasoning and policy carry over while the provider is unchanged. */
export function botFromEditorDraft(draft: BotEditorDraft, existing: BotDefinition | null, takenIds: ReadonlySet<string>): BotEditorResult {
  if (!draft.name.trim()) return { ok: false, message: "Give your bot a name." };
  if (!draft.model) return { ok: false, message: "Choose a provider and model for this bot." };
  const sameProvider = existing && existing.binding.kind === draft.model.kind && existing.binding.instanceId === draft.model.instanceId;
  const parsed = botDefinitionSchema.safeParse({
    id: existing?.id ?? newBotId(draft.name, takenIds), name: draft.name, role: draft.role, instructions: draft.instructions,
    binding: { ...draft.model, reasoning: sameProvider ? existing.binding.reasoning : null, permissionPolicy: sameProvider ? existing.binding.permissionPolicy : null },
    avatar: draft.avatar, scope: draft.scope, revision: existing?.revision ?? 1
  });
  if (parsed.success) return { ok: true, bot: parsed.data };
  const issue = parsed.error.issues[0];
  const field = typeof issue.path[0] === "string" ? FIELD_LABELS[issue.path[0]] ?? issue.path[0] : "Bot";
  return { ok: false, message: `${field}: ${issue.message}` };
}
