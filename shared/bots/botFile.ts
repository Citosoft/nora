import { botDefinitionSchema, botIdSchema } from "./contracts";
import type { BotDefinition } from "@shared/types/bots/bots.types";
import type { BotFileField, BotFileParse } from "@shared/types/bots/botFile.types";

/** Shared workspace bots live at `.nora/bots/<id>.md`: simple `key: value` front matter, then the instructions as the body. */
export const SHARED_BOT_DIRECTORY = ".nora/bots";
export const SHARED_BOT_EXTENSION = ".md";
export const SHARED_BOT_MAX_BYTES = 64 * 1024;

const FIELDS: readonly BotFileField[] = ["name", "role", "provider", "instance", "model", "reasoning", "permission", "shape", "palette", "eyes", "seed", "revision"];
const isField = (key: string): key is BotFileField => (FIELDS as readonly string[]).includes(key);

export function sharedBotFileName(botId: string): string { return `${botIdSchema.parse(botId)}${SHARED_BOT_EXTENSION}`; }

export function parseSharedBotFile(fileName: string, text: string, workspaceId: string): BotFileParse {
  if (!fileName.endsWith(SHARED_BOT_EXTENSION)) return { ok: false, message: "Bot files must end in .md" };
  const id = botIdSchema.safeParse(fileName.slice(0, -SHARED_BOT_EXTENSION.length));
  if (!id.success) return { ok: false, message: "Bot file names must be lowercase words joined by hyphens" };
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  if (lines[0] !== "---") return { ok: false, message: "Bot files must start with a --- front matter block" };
  const end = lines.indexOf("---", 1);
  if (end < 0) return { ok: false, message: "The front matter block is not closed with ---" };
  const fields = new Map<BotFileField, string>();
  for (const [index, line] of lines.slice(1, end).entries()) {
    if (!line.trim()) continue;
    const match = /^([a-z]+):\s?(.*)$/.exec(line);
    if (!match) return { ok: false, message: `Line ${index + 2} is not a "key: value" pair` };
    const [, key, value] = match;
    if (!isField(key)) return { ok: false, message: `Unknown field "${key}" on line ${index + 2}` };
    if (fields.has(key)) return { ok: false, message: `"${key}" appears more than once` };
    fields.set(key, value.trim());
  }
  const field = (key: BotFileField): string | undefined => fields.get(key) || undefined;
  const integer = (key: BotFileField, fallback: number): number => {
    const value = field(key);
    return value === undefined ? fallback : /^\d+$/.test(value) ? Number(value) : Number.NaN;
  };
  const parsed = botDefinitionSchema.safeParse({
    id: id.data, name: fields.get("name") ?? "", role: fields.get("role") ?? "",
    instructions: lines.slice(end + 1).join("\n").trim(),
    binding: { kind: field("provider"), instanceId: field("instance") ?? field("provider"), model: field("model"),
      reasoning: field("reasoning") ?? null, permissionPolicy: field("permission") ?? null },
    avatar: { seed: integer("seed", 0),
      ...(field("shape") ? { shape: field("shape") } : {}), ...(field("palette") ? { palette: field("palette") } : {}), ...(field("eyes") ? { eyes: field("eyes") } : {}) },
    scope: { kind: "workspace", workspaceId, storage: "shared" },
    revision: integer("revision", 1)
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, message: `${issue.path.join(".") || "bot"}: ${issue.message}` };
  }
  return { ok: true, bot: parsed.data };
}

export function serializeSharedBotFile(bot: BotDefinition): string {
  const line = (key: BotFileField, value: string | number | null | undefined): string[] =>
    value === null || value === undefined || value === "" ? [] : [`${key}: ${String(value).replace(/[\r\n]+/g, " ")}`];
  return ["---",
    ...line("name", bot.name), ...line("role", bot.role),
    ...line("provider", bot.binding.kind), ...(bot.binding.instanceId !== bot.binding.kind ? line("instance", bot.binding.instanceId) : []),
    ...line("model", bot.binding.model), ...line("reasoning", bot.binding.reasoning), ...line("permission", bot.binding.permissionPolicy),
    ...line("shape", bot.avatar.shape), ...line("palette", bot.avatar.palette), ...line("eyes", bot.avatar.eyes), ...line("seed", bot.avatar.seed),
    ...line("revision", bot.revision),
    "---", "", bot.instructions, ""].join("\n");
}
