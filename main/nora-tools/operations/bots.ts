import { randomInt } from "node:crypto";
import { effectiveBots, findEffectiveBot, knownBotIds, newBotId } from "@shared/bots/catalog";
import type { BotAvatar, BotDefinition, BotScope } from "@shared/types/bots/bots.types";
import type { BotAvatarInput, NoraBotOperations } from "@main/types/nora-tools/noraTools.types";
import type { NoraToolOperationOptions } from "@main/types/nora-tools/operations.types";
import { resolveBotBinding } from "./botBinding";

const AVATAR_SEED_LIMIT = 2_147_483_646;

function withAvatarParts(avatar: BotAvatar, input: BotAvatarInput): BotAvatar {
  return { ...avatar, ...(input.shape ? { shape: input.shape } : {}), ...(input.colour ? { palette: input.colour } : {}), ...(input.eyes ? { eyes: input.eyes } : {}) };
}

export function createBotOperations(options: NoraToolOperationOptions): NoraBotOperations {
  return {
    list({ conversation }) {
      const boot = options.boot();
      return effectiveBots(boot.personalization.bots, conversation.workspace.projectId, boot.sharedBots);
    },
    async create(input, { conversation }) {
      const boot = options.boot();
      const workspaceId = conversation.workspace.projectId;
      const scope: BotScope = input.availability === "workspace"
        ? { kind: "workspace", workspaceId, storage: input.sharing ?? "private" } : { kind: "global" };
      if (scope.kind === "workspace" && !boot.workspaces.some((entry) => entry.id === workspaceId)) throw new Error("This thread's workspace is not registered in Nora.");
      const thread = conversation.provider;
      const bot: BotDefinition = {
        id: newBotId(input.name, knownBotIds(boot.personalization.bots, workspaceId, boot.sharedBots)),
        name: input.name, role: input.role ?? "", instructions: input.instructions ?? "",
        binding: await resolveBotBinding(input, { kind: thread.kind, instanceId: thread.instanceId, model: thread.model, reasoning: thread.reasoning, permissionPolicy: null },
          conversation.workspace, options),
        avatar: withAvatarParts({ seed: randomInt(AVATAR_SEED_LIMIT) }, input), scope, revision: 1
      };
      await options.saveBot(bot, null);
      return bot;
    },
    async update(input, { conversation }) {
      const boot = options.boot();
      const existing = findEffectiveBot(boot.personalization.bots, conversation.workspace.projectId, boot.sharedBots, input.id);
      if (!existing) throw new Error(`No bot with id "${input.id}" is available in this workspace. Call list_bots for the ids.`);
      const bot: BotDefinition = { ...existing,
        ...(input.name !== undefined ? { name: input.name } : {}), ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.instructions !== undefined ? { instructions: input.instructions } : {}),
        binding: await resolveBotBinding(input, existing.binding, conversation.workspace, options),
        avatar: withAvatarParts(existing.avatar, input) };
      await options.saveBot(bot, existing.scope);
      // The main process assigns revisions; report the saved definition rather than the request.
      const after = options.boot();
      return findEffectiveBot(after.personalization.bots, conversation.workspace.projectId, after.sharedBots, input.id) ?? bot;
    }
  };
}
