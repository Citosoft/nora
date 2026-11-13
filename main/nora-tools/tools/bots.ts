import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { NORA_TOOLS } from "@shared/nora-tools/catalog";
import { BOT_AVATAR_EYES, BOT_AVATAR_PALETTES, BOT_AVATAR_SHAPES, BOT_INSTRUCTIONS_MAX, BOT_NAME_MAX, BOT_ROLE_MAX, botIdSchema } from "@shared/bots/contracts";
import type { BotScope } from "@shared/types/bots/bots.types";
import type { NoraToolContext, NoraToolDeps } from "@main/types/nora-tools/noraTools.types";
import { runTool } from "./result";

const availability = (scope: BotScope): string =>
  scope.kind === "global" ? "everywhere" : scope.storage === "shared" ? "in this workspace, shared in .nora/bots" : "in this workspace, private";
const model = {
  provider: z.string().min(1).optional().describe("Provider kind or instance from list_models, e.g. claude or codex"),
  model: z.string().min(1).optional().describe("Model id from list_models for that provider")
};
const avatar = { shape: z.enum(BOT_AVATAR_SHAPES).optional(), colour: z.enum(BOT_AVATAR_PALETTES).optional(), eyes: z.enum(BOT_AVATAR_EYES).optional() };

export function registerBotTools(server: McpServer, context: NoraToolContext, deps: NoraToolDeps): void {
  server.registerTool("create_bot", { ...NORA_TOOLS.create_bot,
    inputSchema: {
      name: z.string().trim().min(1).max(BOT_NAME_MAX).describe("Short display name, e.g. Ada"),
      role: z.string().trim().max(BOT_ROLE_MAX).optional().describe("One-line purpose shown under the name, e.g. Release manager"),
      instructions: z.string().trim().max(BOT_INSTRUCTIONS_MAX).optional().describe("Standing instructions the bot follows in every thread"),
      availability: z.enum(["everywhere", "workspace"]).optional().describe("everywhere (default) or only this thread's workspace"),
      sharing: z.enum(["private", "shared"]).optional().describe("For workspace bots: private to this user (default) or shared as a .nora/bots file in the repository"),
      ...model, ...avatar
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  }, (input) => runTool(async () => {
    const bot = await deps.bots.create(input, context);
    return `Created ${bot.name} (id ${bot.id}), available ${availability(bot.scope)}, using ${bot.binding.kind} / ${bot.binding.model}. `
      + "It now appears in the Bots sidebar and under Talk to in new threads; the user can edit it in Settings → Bots.";
  }));
  server.registerTool("update_bot", { ...NORA_TOOLS.update_bot,
    inputSchema: {
      id: botIdSchema.describe("The bot's id from list_bots"),
      name: z.string().trim().min(1).max(BOT_NAME_MAX).optional(),
      role: z.string().trim().max(BOT_ROLE_MAX).optional(),
      instructions: z.string().trim().max(BOT_INSTRUCTIONS_MAX).optional().describe("Replaces the bot's instructions entirely"),
      ...model, ...avatar
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, (input) => runTool(async () => {
    const bot = await deps.bots.update(input, context);
    return `Updated ${bot.name} (id ${bot.id}), now revision ${bot.revision}, using ${bot.binding.kind} / ${bot.binding.model}. New threads with it use these changes.`;
  }));
}

/** Offered to every thread with Nora's tools, so callers can find who to ask. */
export function registerBotListTool(server: McpServer, context: NoraToolContext, deps: NoraToolDeps): void {
  server.registerTool("list_bots", { ...NORA_TOOLS.list_bots, annotations: { readOnlyHint: true, openWorldHint: false } }, () => runTool(() => {
    const bots = deps.bots.list(context);
    if (!bots.length) return "There are no bots yet.";
    return bots.map(({ bot }) => `- ${bot.name} (id ${bot.id})${bot.role ? ` — ${bot.role}` : ""}; ${bot.binding.kind} / ${bot.binding.model}; available ${availability(bot.scope)}`).join("\n");
  }));
}
