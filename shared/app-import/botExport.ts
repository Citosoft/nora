import { z } from "zod";

export const BOT_EXPORT_FORMAT = "nora-bot-export";
export const BOT_EXPORT_VERSION = 1;
/** Largest export Nora reads, pasted or chosen as a file. */
export const BOT_EXPORT_MAX_BYTES = 2_000_000;

const text = z.string().max(100_000);

/**
 * Nora's portable bot format. Lenient on purpose: it is often written by another app's bot, so unknown fields
 * are ignored and limits are applied (and reported) when the bots are fitted, not here.
 */
export const botExportSchema = z.object({
  format: z.literal(BOT_EXPORT_FORMAT),
  version: z.literal(BOT_EXPORT_VERSION),
  source: z.string().max(120).optional(),
  bots: z.array(z.object({
    name: z.string().trim().min(1).max(200),
    role: text.optional(),
    instructions: text.optional(),
    skills: z.array(z.object({ name: z.string().max(200), description: text.optional(), instructions: text })).max(100).optional(),
    model: z.object({ provider: z.string().max(100).optional(), model: z.string().max(200).optional() }).optional(),
    avatar: z.object({ shape: z.string().max(40).optional(), color: z.string().max(40).optional() }).optional(),
    memory: z.array(text).max(2000).optional(),
    routines: z.array(z.object({ name: z.string().max(200), instruction: text, schedule: z.unknown(), timezone: z.string().max(64).optional() })).max(100).optional(),
    tools: z.array(z.object({ name: z.string().max(200), url: z.string().max(2000).optional() })).max(200).optional()
  })).min(1).max(200)
});
