import path from "node:path";
import { z } from "zod";
import { appImportAvatarPalette } from "@shared/app-import/botAvatar";
import type { AppImportBot, AppImportSkippedItem } from "@shared/types/app-import/appImportPlan.types";
import type { AppImportBotRoutineDraft } from "@main/types/app-import/appImportBots.types";
import type { AppImportEnvironment } from "@main/types/app-import/appImportSource.types";
import type { OrcaBots } from "@main/types/app-import/orca.types";
import { fitAppImportBot } from "@main/app-import/bots/fitBot";
import { readTextFile } from "@main/app-import/fileSystem";
import { appImportKey } from "@main/app-import/importKey";
import { toProviderRef } from "@main/app-import/providerRef";
import { orcaRruleSchedule } from "./rrule";

const botSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  folder: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  agent: z.string().min(1),
  launch: z.object({ model: z.string().optional().catch(undefined) }).optional().catch(undefined),
  avatarColor: z.string().optional().catch(undefined)
});

const automationSchema = z.object({
  name: z.string().catch("Routine"),
  prompt: z.string().catch(""),
  rrule: z.string().optional().catch(undefined),
  dtstart: z.number().optional().catch(undefined),
  timezone: z.string().optional().catch(undefined),
  on: z.array(z.unknown()).optional().catch(undefined),
  bot: z.object({ botId: z.string() }).optional().catch(undefined)
});

/** Bots live under `~/.orca/bots/<folder>`, with who they are in SOUL.md and what they know in MEMORY.md (orca bot-home.ts). */
function botHome(env: AppImportEnvironment, folder: string): string {
  return path.join(env.homeDir, ".orca", "bots", folder);
}

/** SOUL.md without its `# Name` heading; its first real paragraph doubles as the role (orca bot-soul.ts). */
function soulParts(soul: string): { role: string; instructions: string } {
  const body = soul.replace(/\r\n/g, "\n").replace(/^#[^\n]*\n+/, "").trim();
  const starter = /^Describe .+ here: what it is for, how it talks, and what it must never do\.$/;
  const first = body.split(/\n\s*\n/).map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim()).find((paragraph) => paragraph && !paragraph.startsWith("#")) ?? "";
  return starter.test(first) ? { role: "", instructions: "" } : { role: first, instructions: body };
}

/** MEMORY.md keeps one fact per `- ` line after its heading (orca bot-memory-lines.ts). */
function memoryLines(memory: string): string[] {
  return memory.split(/\r?\n/).filter((line) => line.startsWith("- ")).map((line) => line.slice(2).trim()).filter(Boolean);
}

function routinesFor(botId: string, automations: readonly z.infer<typeof automationSchema>[]): { drafts: AppImportBotRoutineDraft[] } {
  return { drafts: automations.filter((automation) => automation.bot?.botId === botId).map((automation): AppImportBotRoutineDraft => {
    const base = { name: automation.name, instruction: automation.prompt, timezone: automation.timezone ?? null };
    if (automation.on?.length) return { ...base, schedule: null, unsupportedReason: "It runs on Slack, GitHub, Linear or other events, which Nora routines don't support." };
    if (!automation.rrule || automation.dtstart === undefined) return { ...base, schedule: null, unsupportedReason: "It has no schedule." };
    const conversion = orcaRruleSchedule(automation.rrule, automation.dtstart, automation.timezone ?? "UTC");
    return conversion.status === "converted" ? { ...base, schedule: conversion.schedule } : { ...base, schedule: null, unsupportedReason: conversion.reason };
  }) };
}

/**
 * Orca bots from the `bots`/`botsNewerAgents` domains (ordered by `botOrder`), with instructions, memory and the
 * automations that target them. Slack, Linear, GitHub and Google links stay behind: they belong to signed-in accounts.
 */
export async function readOrcaBots(domains: { bots: unknown; newerAgents: unknown; order: unknown; automations: unknown }, env: AppImportEnvironment): Promise<OrcaBots> {
  const records = [domains.bots, domains.newerAgents].flatMap((value) => Array.isArray(value) ? value : []).flatMap((entry) => {
    const parsed = botSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
  const order = Array.isArray(domains.order) ? domains.order.filter((id): id is string => typeof id === "string") : [];
  records.sort((left, right) => (order.indexOf(left.id) + 1 || Number.MAX_SAFE_INTEGER) - (order.indexOf(right.id) + 1 || Number.MAX_SAFE_INTEGER));
  const automations = (Array.isArray(domains.automations) ? domains.automations : []).flatMap((entry) => {
    const parsed = automationSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
  const bots: AppImportBot[] = [];
  const skipped: AppImportSkippedItem[] = [];
  for (const record of records) {
    const home = botHome(env, record.folder);
    const [soul, memory] = await Promise.all([readTextFile(path.join(home, "SOUL.md")), readTextFile(path.join(home, "MEMORY.md"))]);
    const { role, instructions } = soul.status === "ok" ? soulParts(soul.text) : { role: "", instructions: "" };
    const provider = toProviderRef(record.agent);
    const fitted = fitAppImportBot({
      importKey: appImportKey("orca", "bot", record.id), name: record.name, role, instructions,
      model: { ...provider, model: record.launch?.model ?? null },
      avatar: { shape: null, palette: appImportAvatarPalette(record.avatarColor) },
      memory: memory.status === "ok" ? memoryLines(memory.text) : [],
      routines: routinesFor(record.id, automations).drafts
    });
    if (provider.provider === "other") fitted.bot.adjustments.push(`Nora can't run ${record.agent}; it will use your default model.`);
    bots.push(fitted.bot);
    skipped.push(...fitted.skipped);
  }
  return { bots, skipped };
}
