import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { NORA_TOOLS } from "@shared/nora-tools/catalog";
import { botIdSchema } from "@shared/bots/contracts";
import {
  ROUTINE_INSTRUCTION_MAX,
  ROUTINE_NAME_MAX,
  routineIdSchema,
  routineScheduleSchema
} from "@shared/bots/routines/contracts";
import type { NoraToolContext, NoraToolDeps } from "@main/types/nora-tools/noraTools.types";
import { formatRoutineList } from "../operations/routines";
import { runTool } from "./result";

const botIdField = botIdSchema.describe("Bot id from list_bots");

export function registerRoutineListTool(server: McpServer, context: NoraToolContext, deps: NoraToolDeps): void {
  server.registerTool("list_routines", { ...NORA_TOOLS.list_routines,
    inputSchema: {
      bot_id: botIdField.optional().describe("Bot id from list_bots; bots may omit this to list their own")
    },
    annotations: { readOnlyHint: true, openWorldHint: false }
  }, (input) => runTool(() => formatRoutineList(deps.routines.list(input.bot_id, context))));
}

export function registerRoutineTools(server: McpServer, context: NoraToolContext, deps: NoraToolDeps): void {
  server.registerTool("create_routine", { ...NORA_TOOLS.create_routine,
    inputSchema: {
      bot_id: botIdField,
      name: z.string().trim().min(1).max(ROUTINE_NAME_MAX).describe("Short routine name, e.g. Morning briefing"),
      instruction: z.string().trim().min(1).max(ROUTINE_INSTRUCTION_MAX)
        .describe("What the bot should do on each run, written in the second person"),
      schedule: routineScheduleSchema.describe("When it runs: hourly, daily, weekdays, weekly, monthly, interval, once, or custom cron"),
      active: z.boolean().optional().describe("Whether it runs on schedule (default true); false saves it paused"),
      timezone: z.string().trim().min(1).max(64).optional().describe("IANA timezone for wall-clock schedules; defaults to this machine"),
      workspace_id: z.string().trim().min(1).max(512).optional()
        .describe("Workspace id for global bots; defaults to this thread's workspace. Workspace bots always use their own."),
      run_in: z.enum(["chat", "thread"]).optional().describe("chat posts to the bot's direct chat; thread (default) uses a dedicated routine thread"),
      missed_policy: z.enum(["skip", "run-once"]).optional()
        .describe("What to do with occurrences missed while Nora was closed (default skip)")
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  }, (input) => runTool(() => {
    const routine = deps.routines.create({
      botId: input.bot_id,
      name: input.name,
      instruction: input.instruction,
      schedule: input.schedule,
      ...(input.active === undefined ? {} : { active: input.active }),
      ...(input.timezone ? { timezone: input.timezone } : {}),
      ...(input.workspace_id ? { workspaceId: input.workspace_id } : {}),
      ...(input.run_in ? { runIn: input.run_in } : {}),
      ...(input.missed_policy ? { missedPolicy: input.missed_policy } : {})
    }, context);
    return `Created routine ${routine.name} (id ${routine.id}) on bot ${routine.botId}: ${routine.schedule}, `
      + `${routine.active ? "active" : "paused"}, run in ${routine.runIn}`
      + `${routine.nextRunAt ? `, next ${routine.nextRunAt}` : ""}.`;
  }));
  server.registerTool("update_routine", { ...NORA_TOOLS.update_routine,
    inputSchema: {
      id: routineIdSchema.describe("Routine id from list_routines"),
      bot_id: botIdField,
      name: z.string().trim().min(1).max(ROUTINE_NAME_MAX).optional(),
      instruction: z.string().trim().min(1).max(ROUTINE_INSTRUCTION_MAX).optional()
        .describe("Replaces the run instruction entirely when passed"),
      schedule: routineScheduleSchema.optional()
        .describe("Replaces the schedule entirely when passed"),
      active: z.boolean().optional().describe("Pause with false or resume with true"),
      timezone: z.string().trim().min(1).max(64).optional(),
      workspace_id: z.string().trim().min(1).max(512).optional()
        .describe("For global bots only; workspace bots keep their own workspace"),
      run_in: z.enum(["chat", "thread"]).optional(),
      missed_policy: z.enum(["skip", "run-once"]).optional()
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, (input) => runTool(() => {
    const routine = deps.routines.update({
      id: input.id,
      botId: input.bot_id,
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.instruction === undefined ? {} : { instruction: input.instruction }),
      ...(input.schedule === undefined ? {} : { schedule: input.schedule }),
      ...(input.active === undefined ? {} : { active: input.active }),
      ...(input.timezone ? { timezone: input.timezone } : {}),
      ...(input.workspace_id ? { workspaceId: input.workspace_id } : {}),
      ...(input.run_in ? { runIn: input.run_in } : {}),
      ...(input.missed_policy ? { missedPolicy: input.missed_policy } : {})
    }, context);
    return `Updated routine ${routine.name} (id ${routine.id}): ${routine.schedule}, `
      + `${routine.active ? "active" : "paused"}, run in ${routine.runIn}`
      + `${routine.nextRunAt ? `, next ${routine.nextRunAt}` : ""}.`;
  }));
  server.registerTool("remove_routine", { ...NORA_TOOLS.remove_routine,
    inputSchema: {
      id: routineIdSchema.describe("Routine id from list_routines"),
      bot_id: botIdField.describe("Bot that owns the routine, from list_bots")
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
  }, (input) => runTool(() => {
    const routine = deps.routines.remove(input.id, input.bot_id, context);
    return `Removed routine ${routine.name} (id ${routine.id}) from bot ${routine.botId}.`;
  }));
}
