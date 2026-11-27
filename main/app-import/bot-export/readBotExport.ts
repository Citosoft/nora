import { appImportAvatarPalette, appImportAvatarShape } from "@shared/app-import/botAvatar";
import { BOT_EXPORT_MAX_BYTES, BOT_EXPORT_VERSION, botExportSchema } from "@shared/app-import/botExport";
import { appImportSourceDisplayName } from "@shared/app-import/sources";
import type { AppImportBot, AppImportReadResult, AppImportSkippedItem } from "@shared/types/app-import/appImportPlan.types";
import type { AppImportBotDraft } from "@main/types/app-import/appImportBots.types";
import { fitAppImportBot } from "@main/app-import/bots/fitBot";
import { appImportKey } from "@main/app-import/importKey";
import { toProviderRef } from "@main/app-import/providerRef";

type BotExport = ReturnType<typeof botExportSchema.parse>;
type ExportedBot = BotExport["bots"][number];

function invalid(reason: string): AppImportReadResult {
  return { status: "unsupported", source: "bot-export", dataPath: "", reason };
}

/** A bot's reply usually wraps the JSON in a code block or a sentence; read the outermost object. */
function extractJson(document: string): unknown {
  const start = document.indexOf("{");
  const end = document.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object found.");
  return JSON.parse(document.slice(start, end + 1));
}

function instructionsWithSkills(bot: ExportedBot): string {
  const skills = (bot.skills ?? []).map((skill) => [`## Skill: ${skill.name.trim()}`, skill.description?.trim(), skill.instructions.trim()].filter(Boolean).join("\n\n"));
  return [bot.instructions?.trim() ?? "", ...skills].filter(Boolean).join("\n\n");
}

function draftFor(bot: ExportedBot, origin: string): AppImportBotDraft {
  const provider = bot.model?.provider ?? bot.model?.model;
  return {
    importKey: appImportKey("bot-export", "bot", origin, bot.name.trim()),
    name: bot.name, role: bot.role ?? "", instructions: instructionsWithSkills(bot),
    model: provider ? { ...toProviderRef(bot.model?.provider ?? ""), model: bot.model?.model ?? null } : null,
    avatar: { shape: appImportAvatarShape(bot.avatar?.shape), palette: appImportAvatarPalette(bot.avatar?.color) },
    memory: bot.memory ?? [],
    routines: (bot.routines ?? []).map((routine) => ({ name: routine.name, instruction: routine.instruction, schedule: routine.schedule, timezone: routine.timezone ?? null }))
  };
}

/** Reads a pasted or chosen Nora bot export into a plan with only bots; secrets and tools never come along. */
export function readBotExport(document: string): AppImportReadResult {
  if (new TextEncoder().encode(document).length > BOT_EXPORT_MAX_BYTES) return invalid("This export is larger than 2 MB.");
  let value: unknown;
  try { value = extractJson(document); } catch { return invalid("This isn't valid JSON. Paste the whole reply, including the braces."); }
  const parsed = botExportSchema.safeParse(value);
  if (!parsed.success) return invalid(`This isn't a Nora bot export (format "nora-bot-export", version ${BOT_EXPORT_VERSION}) with at least one named bot.`);
  const origin = parsed.data.source?.trim() || "";
  const bots: AppImportBot[] = [];
  const skipped: AppImportSkippedItem[] = [];
  for (const exported of parsed.data.bots) {
    const fitted = fitAppImportBot(draftFor(exported, origin));
    if (fitted.bot.model?.provider === "other") fitted.bot.adjustments.push(`Nora can't run ${fitted.bot.model.model ?? fitted.bot.model.sourceProvider}; it will use your default model.`);
    bots.push(fitted.bot);
    skipped.push(...fitted.skipped);
    for (const tool of exported.tools ?? []) {
      skipped.push({ kind: "bot", label: `${fitted.bot.name}: tool "${tool.name}"`, reason: tool.url ? `Add ${tool.url} in Settings → Connections; tools need signing in again.` : "Connect it again in Settings → Connections." });
    }
  }
  return { status: "ready", plan: {
    source: { id: "bot-export", displayName: origin ? `${appImportSourceDisplayName("bot-export")} from ${origin}` : appImportSourceDisplayName("bot-export"), dataPath: "", format: { source: "bot-export", version: BOT_EXPORT_VERSION, origin: origin || null } },
    workspaces: [], threads: [], setupScripts: [], terminalPresets: [], settings: [], keybindings: [], envVars: [], bots, skipped, warnings: []
  } };
}
