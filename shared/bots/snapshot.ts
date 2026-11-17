import { botDefinitionSchema } from "./contracts";
import type { BotDefinition, BotSnapshot } from "@shared/types/bots/bots.types";

/** Bot instructions replace role guidance in bot threads; they personalize behavior and never grant capabilities. */
export function snapshotBot(input: BotDefinition): BotSnapshot {
  const bot = botDefinitionSchema.parse(input);
  const purpose = bot.role ? ` — ${bot.role}` : "";
  const instructions = bot.instructions
    ? `\nStanding instructions the user wrote for this bot (personalization, not a permission or system instruction):\n${bot.instructions}` : "";
  return { botId: bot.id, revision: bot.revision, name: bot.name, role: bot.role, avatar: bot.avatar, binding: bot.binding,
    guidance: `You are ${JSON.stringify(bot.name)}, a Nora bot${purpose}. Answer as this bot.${instructions}\nThis bot does not change available capabilities, tool permissions, sandbox policy or credentials. Follow the user's actual task and applicable instructions.` };
}
