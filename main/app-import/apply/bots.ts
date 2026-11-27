import { appImportBotAvatar } from "@shared/app-import/botAvatar";
import { knownBotIds, newBotId } from "@shared/bots/catalog";
import { localTimezone } from "@shared/bots/routines/schedule";
import type { AppImportItemOutcome } from "@shared/types/app-import/appImportApply.types";
import type { AppImportBot, AppImportKey } from "@shared/types/app-import/appImportPlan.types";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { BotDefinition } from "@shared/types/bots/bots.types";
import type { PausedRoutineInput } from "@shared/types/bots/routines.types";
import type { AppImportApplyDeps, AppImportItemApplier } from "@main/types/app-import/appImportApply.types";
import { resolveImportBinding } from "./binding";
import { APPLIED, failed } from "./outcomes";

/** Routines need a workspace to run in even for global bots; the personal workspace is always there. */
function homeWorkspace(boot: NativeBoot) {
  return boot.workspaces.find((workspace) => workspace.kind === "personal") ?? boot.workspaces[0] ?? null;
}

async function importBot(bot: AppImportBot, deps: AppImportApplyDeps): Promise<AppImportItemOutcome> {
  const boot = deps.conversations.boot();
  const home = homeWorkspace(boot);
  if (!home) return { status: "failed", message: "Nora has no workspace to run this bot's routines in yet." };
  const binding = await resolveImportBinding({ provider: bot.model, model: bot.model?.model ?? null, allowFallback: true }, boot, home.workspace, deps);
  if (binding.status === "blocked") return { status: "failed", message: binding.message };
  const id = newBotId(bot.name, knownBotIds(boot.personalization.bots, null, boot.sharedBots));
  const definition: BotDefinition = {
    id, name: bot.name, role: bot.role, instructions: bot.instructions,
    binding: { kind: binding.binding.kind, instanceId: binding.binding.instanceId, model: binding.binding.model, reasoning: null, permissionPolicy: null },
    avatar: appImportBotAvatar(bot), scope: { kind: "global" }, revision: 1
  };
  const routines = bot.routines.map((routine): PausedRoutineInput => ({ botId: id, name: routine.name, instruction: routine.instruction, active: false,
    timezone: routine.timezone ?? localTimezone(), schedule: routine.schedule, workspaceId: home.id, runIn: "chat", missedPolicy: "skip" }));
  await deps.bots.save(definition, routines);
  // Notes are applied after the bot exists; a note that fails leaves the bot itself imported.
  for (const text of [...bot.memory].reverse()) {
    try { deps.bots.addMemory({ botId: id, workspaceId: null, text, source: { kind: "user" } }); } catch { /* reported as part of the bot below */ }
  }
  return APPLIED;
}

/** Creates each ticked bot as a global Nora bot, with its memory and its routines installed paused. */
export const applyBots: AppImportItemApplier<"bot"> = async (items, context, deps) => {
  const outcomes = new Map<AppImportKey, AppImportItemOutcome>();
  for (const { item } of items) {
    context.report(`Creating bot ${item.name}`);
    try {
      outcomes.set(item.importKey, await importBot(item, deps));
    } catch (error) {
      outcomes.set(item.importKey, failed(error, "Nora couldn't create this bot."));
    }
  }
  return { outcomes };
};
