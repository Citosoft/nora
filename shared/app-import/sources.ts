import type { AppImportDetectedSourceId, AppImportSourceId } from "@shared/types/app-import/appImportSource.types";

export const APP_IMPORT_DETECTED_SOURCE_IDS = ["claude", "codex", "t3-code", "orca", "openbot"] as const satisfies readonly AppImportDetectedSourceId[];
/** Apps whose projects, threads and settings Nora reads ("Bring in your work"). */
export const APP_IMPORT_WORK_SOURCE_IDS = ["claude", "codex", "t3-code", "orca"] as const satisfies readonly AppImportDetectedSourceId[];
/** Apps whose data on disk can include bots; others only offer bots through an export. */
export const APP_IMPORT_BOT_SOURCE_IDS = ["orca", "openbot"] as const satisfies readonly AppImportDetectedSourceId[];
export const APP_IMPORT_SOURCE_IDS = [...APP_IMPORT_DETECTED_SOURCE_IDS, "bot-export"] as const satisfies readonly AppImportSourceId[];

const DISPLAY_NAMES: Readonly<Record<AppImportSourceId, string>> = { claude: "Claude", codex: "Codex", "t3-code": "T3 Code", orca: "Orca", openbot: "OpenBot", "bot-export": "Bot export" };

export function isAppImportSourceId(value: string): value is AppImportSourceId {
  return (APP_IMPORT_SOURCE_IDS as readonly string[]).includes(value);
}

export function appImportSourceDisplayName(id: AppImportSourceId): string {
  return DISPLAY_NAMES[id];
}

/** Display name for an importer id stored on imported items; unknown ids are shown as stored. */
export function importerDisplayName(importerId: string): string {
  return isAppImportSourceId(importerId) ? appImportSourceDisplayName(importerId) : importerId;
}
