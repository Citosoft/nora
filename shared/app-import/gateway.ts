import { z } from "zod";
import { BOT_EXPORT_MAX_BYTES } from "./botExport";
import { APP_IMPORT_DETECTED_SOURCE_IDS } from "./sources";

export const APP_IMPORT_CHANNELS = {
  preview: "app-import:preview",
  previewBotExport: "app-import:preview-bot-export",
  apply: "app-import:apply",
  progress: "app-import:progress"
} as const;

/** Which apps to read; omitted reads every app Nora can find. */
export const appImportPreviewRequestSchema = z.array(z.enum(APP_IMPORT_DETECTED_SOURCE_IDS)).min(1).max(APP_IMPORT_DETECTED_SOURCE_IDS.length).optional();

const selectedKeysSchema = z.array(z.string().min(1).max(2048)).max(20_000);
export const appImportBotExportDocumentSchema = z.string().min(1).max(BOT_EXPORT_MAX_BYTES);

export const appImportApplyRequestSchema = z.object({
  selections: z.array(z.union([
    z.object({ source: z.enum(APP_IMPORT_DETECTED_SOURCE_IDS), selectedKeys: selectedKeysSchema }).strict(),
    z.object({ source: z.literal("bot-export"), document: appImportBotExportDocumentSchema, selectedKeys: selectedKeysSchema }).strict()
  ])).max(20),
  runId: z.string().min(1).max(200)
}).strict();
