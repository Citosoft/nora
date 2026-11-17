import type { BotDefinition, BotScope } from "@shared/types/bots/bots.types";

export function bot(id: string, scope: BotScope = { kind: "global" }, overrides: Partial<BotDefinition> = {}): BotDefinition {
  return { id, name: id.replace(/(^|-)([a-z])/g, (_, gap: string, letter: string) => `${gap ? " " : ""}${letter.toUpperCase()}`), role: "Helper",
    instructions: "Be concise.", binding: { kind: "claude", instanceId: "claude", model: "claude-opus-5-5", reasoning: null, permissionPolicy: null },
    avatar: { seed: 7 }, scope, revision: 1, ...overrides };
}
