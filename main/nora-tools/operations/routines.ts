import { findEffectiveBot } from "@shared/bots/catalog";
import { localTimezone } from "@shared/bots/routines/schedule";
import type { Routine, RoutineInput, RoutineSchedule } from "@shared/types/bots/routines.types";
import type {
  CreateNoraRoutineInput,
  NoraRoutineInfo,
  NoraRoutineOperations,
  NoraToolContext,
  UpdateNoraRoutineInput
} from "@main/types/nora-tools/noraTools.types";
import type { NoraToolOperationOptions } from "@main/types/nora-tools/operations.types";

function unavailable(): never {
  throw new Error("Bot routines are unavailable in this environment.");
}

export function describeRoutineSchedule(schedule: RoutineSchedule): string {
  switch (schedule.kind) {
    case "hourly": return `hourly at minute ${schedule.minute}`;
    case "daily": return `daily at ${schedule.time}`;
    case "weekdays": return `weekdays at ${schedule.time}`;
    case "weekly": return `weekly on weekday ${schedule.weekday} at ${schedule.time}`;
    case "monthly": return `monthly on day ${schedule.day} at ${schedule.time}`;
    case "interval": return `every ${schedule.amount} ${schedule.unit} from ${schedule.anchorAt}`;
    case "custom": return `cron ${schedule.expression}`;
    case "once": return `once on ${schedule.date} at ${schedule.time}`;
  }
}

export function toRoutineInfo(routine: Routine): NoraRoutineInfo {
  return {
    id: routine.id,
    botId: routine.botId,
    name: routine.name,
    instruction: routine.instruction,
    active: routine.active,
    timezone: routine.timezone,
    schedule: describeRoutineSchedule(routine.schedule),
    workspaceId: routine.workspaceId,
    runIn: routine.runIn,
    missedPolicy: routine.missedPolicy,
    nextRunAt: routine.nextRunAt
  };
}

export function formatRoutineList(routines: readonly NoraRoutineInfo[]): string {
  if (!routines.length) return "This bot has no routines yet.";
  return routines.map((routine) => {
    const details = [
      `id ${routine.id}`,
      routine.active ? "active" : "paused",
      routine.schedule,
      `timezone ${routine.timezone}`,
      `run in ${routine.runIn}`,
      `missed ${routine.missedPolicy}`,
      routine.nextRunAt ? `next ${routine.nextRunAt}` : "no next run",
      `workspace ${routine.workspaceId}`
    ];
    return `- ${routine.name} (${details.join("; ")})`;
  }).join("\n");
}

function resolveBotId(botId: string | undefined, context: NoraToolContext): string {
  if (botId) return botId;
  if (context.audience === "bot" && context.conversation.bot) return context.conversation.bot.botId;
  throw new Error("Pass bot_id from list_bots.");
}

function requireBot(options: NoraToolOperationOptions, botId: string, context: NoraToolContext) {
  const boot = options.boot();
  const bot = findEffectiveBot(boot.personalization.bots, context.conversation.workspace.projectId, boot.sharedBots, botId);
  if (!bot) throw new Error(`No bot with id "${botId}" is available in this workspace. Call list_bots for the ids.`);
  return bot;
}

function resolveWorkspaceId(
  options: NoraToolOperationOptions,
  bot: ReturnType<typeof requireBot>,
  context: NoraToolContext,
  requested: string | undefined
): string {
  const workspaceId = bot.scope.kind === "workspace"
    ? bot.scope.workspaceId
    : (requested ?? context.conversation.workspace.projectId);
  if (!options.boot().workspaces.some((entry) => entry.id === workspaceId)) {
    throw new Error("Choose a workspace that is open in Nora.");
  }
  return workspaceId;
}

export function createRoutineOperations(options: NoraToolOperationOptions): NoraRoutineOperations {
  const store = options.routines;
  return {
    list(botId, context) {
      if (!store) unavailable();
      const id = resolveBotId(botId, context);
      requireBot(options, id, context);
      return store.list(id).routines.map(toRoutineInfo);
    },
    create(input: CreateNoraRoutineInput, context) {
      if (!store) unavailable();
      const bot = requireBot(options, input.botId, context);
      const workspaceId = resolveWorkspaceId(options, bot, context, input.workspaceId);
      return toRoutineInfo(store.create({
        botId: input.botId,
        name: input.name,
        instruction: input.instruction,
        schedule: input.schedule,
        active: input.active ?? true,
        timezone: input.timezone ?? localTimezone(),
        workspaceId,
        runIn: input.runIn ?? "thread",
        missedPolicy: input.missedPolicy ?? "skip"
      }));
    },
    update(input: UpdateNoraRoutineInput, context) {
      if (!store) unavailable();
      const bot = requireBot(options, input.botId, context);
      const current = store.list(input.botId).routines.find((routine) => routine.id === input.id);
      if (!current) throw new Error("This routine no longer exists. Call list_routines for the ids.");
      const workspaceId = resolveWorkspaceId(options, bot, context, input.workspaceId ?? current.workspaceId);
      const next: RoutineInput = {
        botId: current.botId,
        name: input.name ?? current.name,
        instruction: input.instruction ?? current.instruction,
        schedule: input.schedule ?? current.schedule,
        active: input.active ?? current.active,
        timezone: input.timezone ?? current.timezone,
        workspaceId,
        runIn: input.runIn ?? current.runIn,
        missedPolicy: input.missedPolicy ?? current.missedPolicy
      };
      return toRoutineInfo(store.update(input.id, next));
    },
    remove(id, botId, context) {
      if (!store) unavailable();
      const ownerId = resolveBotId(botId, context);
      requireBot(options, ownerId, context);
      const current = store.list(ownerId).routines.find((routine) => routine.id === id);
      if (!current) throw new Error("This routine no longer exists. Call list_routines for the ids.");
      store.remove(id);
      return toRoutineInfo(current);
    }
  };
}
