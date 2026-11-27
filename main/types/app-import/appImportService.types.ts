import type { ConversationInvocation } from "@main/types/execution/gateway.types";
import type { ExternalSessionReader } from "@main/types/execution/externalSessions.types";
import type { AppImportApplyRequest, AppImportApplyResult, AppImportPreview, AppImportProgress, AppImportSourcePreview } from "@shared/types/app-import/appImportApply.types";
import type { NativeProviderKind } from "@shared/types/provider/providerKind.types";
import type { AppImportDetectedSourceId } from "@shared/types/app-import/appImportSource.types";
import type { AppImportApplyDeps, AppImportKeybindingPort } from "./appImportApply.types";
import type { MainServices } from "@main/types/mainServices.types";
import type { NativeRuntime } from "@main/types/native-runtime/runtime.types";
import type { AppSettings } from "@shared/types/system.types";
import type { AppImportEnvironment } from "./appImportSource.types";

export interface AppImportServiceDeps {
  environment(): AppImportEnvironment;
  /** Claude/Codex history readers used to decide which imported threads can still be resumed. */
  sessionReaders(): Partial<Record<NativeProviderKind, ExternalSessionReader>>;
  apply: Omit<AppImportApplyDeps, "onProgress">;
  onProgress(progress: AppImportProgress): void;
}

export interface AppImportService {
  /** Reads the given apps, or every app Nora can find when omitted. */
  preview(sources?: readonly AppImportDetectedSourceId[]): Promise<AppImportPreview>;
  /** Reads a pasted or chosen bot export without importing anything. */
  previewBotExport(document: string): Promise<AppImportSourcePreview>;
  apply(request: AppImportApplyRequest): Promise<AppImportApplyResult>;
}

export interface AppImportIpcDeps {
  ipc: {
    handle(channel: string, handler: (event: ConversationInvocation, input?: unknown) => Promise<unknown>): void;
    removeHandler(channel: string): void;
  };
  service: AppImportService;
  isAllowedSender(event: ConversationInvocation): boolean;
}

/** What main wiring hands the importer; each is narrowed into an apply port in `appImportRuntime`. */
export interface AppImportRuntimeInput {
  ledgerPath: string;
  nextId(): string;
  now(): string;
  services: {
    snapshot: Pick<MainServices["snapshot"], "getSnapshot">;
    workspace: Pick<MainServices["workspace"], "selectProject" | "saveWorkspaceSetupScripts" | "saveWorkspaceTerminalPresets">;
  };
  settings: { read(): AppSettings; update(change: (current: AppSettings) => AppSettings): Promise<AppSettings> };
  native: () => Pick<NativeRuntime, "host" | "personalization" | "secrets" | "memory">;
  keybindings: AppImportKeybindingPort;
  onProgress(progress: AppImportProgress): void;
}
