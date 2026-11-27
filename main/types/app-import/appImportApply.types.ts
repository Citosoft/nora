import type { CommandReceipt, ConversationCommand, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { ProviderCatalogResult } from "@shared/types/provider/catalog.types";
import type { ProviderKind } from "@shared/types/provider/providerKind.types";
import type { ThreadModelDefault } from "@shared/types/personalization/threadModel.types";
import type { KeybindingOverridesApplyOptions, KeybindingOverridesApplyResult, KeybindingOverridesInput } from "@shared/types/keybindings/keybindings.types";
import type { TerminalPreset } from "@shared/types/system.types";
import type { WorkspaceSetupScriptInput } from "@shared/types/workspaceSetupScript.types";
import type { AppImportItemOutcome, AppImportProgress, AppImportRendererChanges } from "@shared/types/app-import/appImportApply.types";
import type { AppImportPlanItem } from "@shared/types/app-import/appImportItem.types";
import type { AppImportKey, AppImportPlan, AppImportWorkspace } from "@shared/types/app-import/appImportPlan.types";
import type { SuppliedHistory } from "@main/types/execution/externalSessions.types";
import type { SecretLocation, SecretSave } from "@main/types/secrets/secrets.types";
import type { AppImportLedger } from "./appImportLedger.types";
import type { BotDefinition } from "@shared/types/bots/bots.types";
import type { PausedRoutineInput } from "@shared/types/bots/routines.types";
import type { NewBotMemory } from "@main/types/bots/memory.types";

/** A Nora project (shell workspace) as the importer sees it. */
export interface AppImportProject {
  id: string;
  rootPath: string;
}

export type AppImportOpenProjectResult = { status: "opened"; project: AppImportProject } | { status: "failed"; message: string };

export interface AppImportProjectPort {
  list(): AppImportProject[];
  /** The project open in the window, restored after the import opens others. */
  activePath(): string | null;
  open(path: string): Promise<AppImportOpenProjectResult>;
  /** Registers the project with the execution host so threads can be created in it; returns the refreshed boot. */
  register(projectId: string): Promise<NativeBoot>;
}

export interface AppImportSetupScriptPort {
  saveImported(projectId: string, importerId: string, scripts: WorkspaceSetupScriptInput[]): Promise<void>;
}

export interface AppImportTerminalPresetPort {
  workspacePresets(projectId: string): TerminalPreset[];
  saveWorkspacePresets(projectId: string, presets: TerminalPreset[]): Promise<void>;
  globalPresets(): TerminalPreset[];
  saveGlobalPresets(presets: TerminalPreset[]): Promise<void>;
}

export interface AppImportConversationPort {
  boot(): NativeBoot;
  catalog(kind: ProviderKind, instanceId: string, workspace: WorkspaceRef): Promise<ProviderCatalogResult>;
  execute(command: ConversationCommand): Promise<CommandReceipt>;
  importHistory(command: ConversationCommand, history: SuppliedHistory): Promise<CommandReceipt>;
}

export interface AppImportSettingsPort {
  setThreadModel(model: ThreadModelDefault): Promise<void>;
}

export interface AppImportKeybindingPort {
  applyKeybindingOverrides(overrides: KeybindingOverridesInput, options?: KeybindingOverridesApplyOptions): Promise<KeybindingOverridesApplyResult>;
}

export interface AppImportSecretPort {
  has(location: SecretLocation): boolean;
  save(secret: SecretSave): void;
}

export interface AppImportBotPort {
  /** Saves a new global bot with its routines (which arrive paused); rejects without saving either on failure. */
  save(bot: BotDefinition, routines: PausedRoutineInput[]): Promise<void>;
  addMemory(note: NewBotMemory): void;
}

export interface AppImportApplyDeps {
  ledger: AppImportLedger;
  projects: AppImportProjectPort;
  setupScripts: AppImportSetupScriptPort;
  terminalPresets: AppImportTerminalPresetPort;
  conversations: AppImportConversationPort;
  settings: AppImportSettingsPort;
  keybindings: AppImportKeybindingPort;
  secrets: AppImportSecretPort;
  bots: AppImportBotPort;
  /** Resolves symlinks so the same folder is recognised however it was written; returns the input when it can't. */
  canonicalPath(path: string): Promise<string>;
  onProgress?(progress: Omit<AppImportProgress, "runId">): void;
}

/** What earlier steps established that later ones need. */
export interface AppImportApplyContext {
  plan: AppImportPlan;
  workspaces: ReadonlyMap<AppImportKey, AppImportWorkspace>;
  /** Nora projects for the plan's workspaces that exist in Nora (added now or before). */
  projects: Map<AppImportKey, AppImportProject>;
  /** Items an earlier run applied; steps that replace a whole importer-owned list keep them. */
  importedKeys: ReadonlySet<AppImportKey>;
  /** Marks the start of one item for progress reporting. */
  report(label: string): void;
}

export interface AppImportStepResult {
  outcomes: Map<AppImportKey, AppImportItemOutcome>;
  renderer?: Partial<AppImportRendererChanges>;
}

export type AppImportItemApplier<K extends AppImportPlanItem["kind"]> = (
  items: readonly Extract<AppImportPlanItem, { kind: K }>[],
  context: AppImportApplyContext,
  deps: AppImportApplyDeps
) => Promise<AppImportStepResult>;
