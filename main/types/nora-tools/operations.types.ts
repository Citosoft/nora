import type { NoraWorkerWorkspaces } from "./workerWorkspaces.types";
import type { NoraTerminalInfo } from "@main/types/nora-tools/noraTools.types";
import type { WindowSettingsPort } from "@shared/types/nora-tools/settings.types";
import type { SettingsSyncService } from "@main/types/settings-sync/service.types";
import type { ProviderBinding } from "@shared/types/conversation/contracts.types";
import type { BotConversationHost } from "@main/types/bots/conversations.types";
import type { BotMemoryStore } from "@main/types/bots/memory.types";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { BotDefinition, BotScope } from "@shared/types/bots/bots.types";
import type { AppSettings, WorkspaceTaskBoard, WorkspaceTaskSummary } from "@shared/appTypes";
import type { SecretService } from "@main/types/secrets/secrets.types";
import type { LoopRunner } from "@main/types/loopRunner.types";
import type { AppService } from "@main/types/apps/apps.types";
import type { ConnectorToolAccess } from "@main/types/connectors/connectors.types";
import type { Routine, RoutineInput, RoutineList } from "@shared/types/bots/routines.types";

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
/** The window's project for a native workspace, which owns its task board and workflows. */
export interface NoraShellProject { id: string; name: string; }
/** Where a workflow run of a shell project starts; runs prepare against the project open in Nora, so others are unavailable. */
export type NoraWorkflowRunPlacement = "worktree" | "project-folder" | "unavailable";
/** Workflow access for Nora's tools: the app's own workflow runner, so saves and runs behave exactly as in the Workflows tool. */
export interface NoraWorkflowStore {
  runner: Pick<LoopRunner, "listDefinitions" | "saveDefinition" | "listRuns" | "getRun" | "startRun" | "pauseRun" | "resumeRun" | "cancelRun" | "reportStage">;
  runPlacement(projectId: string): NoraWorkflowRunPlacement;
}
export interface NoraToolOperationOptions {
  workerWorkspaces?: NoraWorkerWorkspaces;
  host: BotConversationHost;
  nextId(): string;
  boot(): NativeBoot;
  /** Persists through the same path as Settings, so bots are validated and broadcast to the window. */
  saveBot(bot: BotDefinition, previousScope: BotScope | null): Promise<void>;
  memory: BotMemoryStore;
  secrets: Pick<SecretService, "request" | "list" | "remove" | "run">;
  /** Absent when the task board is unavailable in this environment. */
  tasks?: NoraTaskStore;
  onTasksChanged?: (projectId: string) => void;
  /** Absent when workflows are unavailable in this environment. */
  workflows?: NoraWorkflowStore;
  /** Apps the agent builds, and the connector tools they are built on. */
  apps: AppService;
  connectorTools: ConnectorToolAccess;
  /** Open workspace terminals and the permanent local dock; absent when the classic session surface is unavailable. */
  terminals?: NoraTerminalStore;
  /** Bot routines; absent when the scheduler is unavailable in this environment. */
  routines?: NoraRoutineStore;
}

/** Routine access for Nora's tools, backed by the bot routine scheduler. */
export interface NoraRoutineStore {
  list(botId: string): RoutineList;
  create(input: RoutineInput): Routine;
  update(id: string, input: RoutineInput): Routine;
  remove(id: string): void;
}

/** Terminal access for Nora's tools: list open sessions, open new ones, and paste without submitting. */
export interface NoraTerminalStore {
  list(shellProjectId: string | null): NoraTerminalInfo[];
  /** Opens the local dock (idempotent) or a blank workspace terminal for `shellProjectId`. */
  open(input: { kind: "local" } | { kind: "workspace"; shellProjectId: string; name?: string }): Promise<NoraTerminalInfo>;
  /** Pastes `text` into the terminal without Enter; strips one trailing newline. */
  paste(id: string, text: string): Promise<NoraTerminalInfo>;
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
