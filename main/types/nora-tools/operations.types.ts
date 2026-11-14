import type { WindowSettingsPort } from "@shared/types/nora-tools/settings.types";
import type { SettingsSyncService } from "@main/types/settings-sync/service.types";
import type { ProviderBinding } from "@shared/types/conversation/contracts.types";
import type { BotConversationHost } from "@main/types/bots/conversations.types";
import type { BotMemoryStore } from "@main/types/bots/memory.types";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { BotDefinition, BotScope } from "@shared/types/bots/bots.types";
import type { AppSettings, WorkspaceTaskBoard, WorkspaceTaskSummary } from "@shared/appTypes";

/** Task board access for a shell project, backed by the workspace service. */
export interface NoraTaskStore {
  list(projectId: string): Promise<WorkspaceTaskSummary[]>;
  read(projectId: string, path: string): Promise<string>;
  move(projectId: string, fromPath: string, toPath: string): Promise<void>;
  board(projectId: string): Promise<WorkspaceTaskBoard>;
  saveBoard(projectId: string, board: WorkspaceTaskBoard): Promise<WorkspaceTaskBoard>;
  /** Writes a new task file and places it on the board; returns its workspace-relative path. */
  create(projectId: string, title: string, content: string): Promise<string>;
}
export interface NoraToolOperationOptions {
  host: BotConversationHost;
  nextId(): string;
  boot(): NativeBoot;
  /** Persists through the same path as Settings, so bots are validated and broadcast to the window. */
  saveBot(bot: BotDefinition, previousScope: BotScope | null): Promise<void>;
  memory: BotMemoryStore;
  /** Absent when the task board is unavailable in this environment. */
  tasks?: NoraTaskStore;
  onTasksChanged?: (projectId: string) => void;
}
/** The model a bot falls back to when the caller names no provider or model. */
export interface BotBindingFallback { kind: ProviderBinding["kind"]; instanceId: string; model: string; reasoning: string | null; permissionPolicy: string | null; }

/** Settings access is separate from the bot and workspace operation dependencies. */
export interface NoraSettingsOptions {
  windowSettings: WindowSettingsPort;
  settingsSync: Pick<SettingsSyncService, "request">;
  readSettings(): AppSettings;
  updateSettings(change: (settings: AppSettings) => AppSettings): Promise<AppSettings>;
  onSettingsChanged(settings: AppSettings): void;
}
