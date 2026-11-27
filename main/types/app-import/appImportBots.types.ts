import type { AppImportBot, AppImportKey, AppImportProviderRef, AppImportSkippedItem } from "@shared/types/app-import/appImportPlan.types";

/** A routine as the source describes it; the schedule is checked against Nora's when the bot is fitted. */
export interface AppImportBotRoutineDraft {
  name: string;
  instruction: string;
  /** Nora routine schedule, or null with `unsupportedReason` when the source's schedule has no Nora form. */
  schedule: unknown;
  timezone: string | null;
  unsupportedReason?: string;
}

/** A bot as read from a source, before it is fitted to Nora's limits. */
export interface AppImportBotDraft {
  importKey: AppImportKey;
  name: string;
  role: string;
  instructions: string;
  model: (AppImportProviderRef & { model: string | null }) | null;
  avatar: AppImportBot["avatar"];
  memory: readonly string[];
  routines: readonly AppImportBotRoutineDraft[];
}

export interface AppImportFittedBot {
  bot: AppImportBot;
  skipped: AppImportSkippedItem[];
}

/** One OpenBot agent as gathered from its database rows and its folder. */
export interface OpenBotAgentRecord {
  id: string;
  name: string | null;
  role: string;
  folder: string | null;
}
