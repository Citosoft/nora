import { botDefinitionSchema } from "@shared/bots/contracts";
import { putStoredBot, removeStoredBot, sameBotScope, setBotHidden, storedBot } from "@shared/bots/settingsMutations";
import type { AppSettings } from "@shared/appTypes";
import type { BotDefinition, BotScope } from "@shared/types/bots/bots.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { PersonalizationRequest } from "@shared/ipc/types/personalizationGateway.types";
import type { PersonalizationSettings } from "@main/types/personalization/services.types";
import type { BotRequest, BotRequestDeps } from "@main/types/bots/sharedBots.types";

export function isBotRequest(request: PersonalizationRequest): request is BotRequest {
  return request.kind === "save-bot" || request.kind === "delete-bot" || request.kind === "set-bot-hidden" || request.kind === "refresh-bots";
}

function scopeWorkspace(deps: BotRequestDeps, scope: BotScope): NativeWorkspace | null {
  if (scope.kind === "global") return null;
  const workspace = deps.workspaces().find((entry) => entry.id === scope.workspaceId);
  if (!workspace) throw new Error("Select an existing workspace");
  return workspace;
}

function existingBot(deps: BotRequestDeps, settings: AppSettings, scope: BotScope, botId: string): BotDefinition | null {
  if (scope.kind === "workspace" && scope.storage === "shared") {
    return deps.library.list().find((set) => set.workspaceId === scope.workspaceId)?.bots.find((bot) => bot.id === botId) ?? null;
  }
  return storedBot(settings.personalization.bots, scope, botId);
}

async function removeAt(deps: BotRequestDeps, settings: PersonalizationSettings, scope: BotScope, botId: string): Promise<void> {
  const workspace = scopeWorkspace(deps, scope);
  if (workspace && scope.kind === "workspace" && scope.storage === "shared") await deps.library.remove(workspace, botId);
  else await settings.update((current) => ({ ...current, personalization: { ...current.personalization, bots: removeStoredBot(current.personalization.bots, scope, botId) } }));
}

/** Bot changes; the main process owns revisions and where each definition is stored. */
export async function applyBotRequest(request: BotRequest, settings: PersonalizationSettings, deps: BotRequestDeps): Promise<void> {
  switch (request.kind) {
    case "refresh-bots": break;
    case "save-bot": {
      const input = botDefinitionSchema.parse(request.bot);
      const workspace = scopeWorkspace(deps, input.scope);
      const previousScope = request.previousScope;
      const previous = previousScope ? existingBot(deps, settings.read(), previousScope, input.id) : null;
      if (previousScope && !previous) throw new Error("This bot changed or was removed. Reload bots and try again.");
      if (!previousScope && existingBot(deps, settings.read(), input.scope, input.id)) throw new Error("A bot with this id already exists here");
      const bot: BotDefinition = { ...input, revision: previous ? previous.revision + 1 : 1 };
      if (workspace && bot.scope.kind === "workspace" && bot.scope.storage === "shared") await deps.library.write(workspace, bot);
      else await settings.update((current) => ({ ...current, personalization: { ...current.personalization, bots: putStoredBot(current.personalization.bots, bot) } }));
      // Write the new location first so a failed move never loses the bot.
      if (previousScope && !sameBotScope(previousScope, bot.scope)) await removeAt(deps, settings, previousScope, bot.id);
      break;
    }
    case "delete-bot": await removeAt(deps, settings, request.scope, request.botId); break;
    case "set-bot-hidden": {
      if (!deps.workspaces().some((entry) => entry.id === request.workspaceId)) throw new Error("Select an existing workspace");
      await settings.update((current) => ({ ...current, personalization: { ...current.personalization,
        bots: setBotHidden(current.personalization.bots, request.workspaceId, request.botId, request.hidden) } }));
      break;
    }
  }
  await deps.library.refresh(deps.workspaces());
}
