import type { ReactNode } from "react";
import type { StateStore } from "@json-render/core";
import type { AppsBridge } from "@shared/ipc/types/appsGateway.types";
import type { AppFile, PickedAppFile } from "@shared/types/apps/portable.types";
import type { AppAction, AppActionResult, AppActivityEntry, AppDefinition, AppRenderData, AppSourceState, AppSummary, AppValueFormat, AppVersion } from "@shared/types/apps/apps.types";
import type { JsonValue } from "@main/jsonValue";
import type { AppPanelMove } from "@shared/types/apps/panelLayout.types";

export type AppsClient = AppsBridge;

/** Every app, kept current by main's change notifications. */
export interface AppsList {
  apps: readonly AppSummary[] | null;
  error: string | null;
  rename(id: string, name: string): Promise<void>;
  setTrusted(id: string, trusted: boolean): Promise<void>;
  remove(id: string): Promise<void>;
  /** Saves the app as a file through the OS dialog; the path written, or null when cancelled. */
  exportToFile(id: string): Promise<string | null>;
  /** Opens the OS dialog for an app file; null when cancelled. */
  pickImport(): Promise<PickedAppFile | null>;
  /** Saves a picked file as a new app in the workspace, each file connector replaced by the local one chosen. */
  importFile(workspaceId: string, file: AppFile, connectorIds: Readonly<Record<string, string>>): Promise<AppDefinition>;
}

/** An action the user has been asked to confirm: what will run, with its arguments resolved. */
export interface PendingAppAction {
  actionId: string;
  action: AppAction;
  args: Record<string, JsonValue>;
  connectorName: string;
}
export interface AppActionOutcome extends AppActionResult { actionId: string; at: number; }

/** One open app: its definition, the json-render state store its UI reads, and what the user can do with it. */
export interface AppRuntime {
  app: AppDefinition | null;
  data: AppRenderData | null;
  store: StateStore;
  loading: boolean;
  error: string | null;
  pending: PendingAppAction | null;
  outcome: AppActionOutcome | null;
  refresh(sourceIds?: readonly string[]): void;
  /** Appends the next page of a paged source. */
  loadMore(sourceId: string): void;
  /** Resolves the action's arguments and runs it, after confirmation unless the app is trusted. */
  runAction(actionId: string, item: JsonValue | undefined): void;
  confirmPending(): void;
  cancelPending(): void;
  dismissOutcome(): void;
  versions(): Promise<AppVersion[]>;
  restoreVersion(version: number): Promise<void>;
  movePanel(move: AppPanelMove): Promise<void>;
  /** The newest actions the app ran, most recent first. */
  activity(): Promise<AppActivityEntry[]>;
}

export interface AppRendererProps { runtime: AppRuntime; }
/** `inBuilder` hides Edit, since the app is already beside its builder thread. */
export interface AppViewProps { appId: string; inBuilder?: boolean; }
export interface AppBuilderViewProps { documentId: string; }
export interface AppsSidebarProps { collapsed: boolean; }
export interface ConfirmActionSheetProps { pending: PendingAppAction; onConfirm(): void; onCancel(): void; }
export interface SourceStateProps { state: AppSourceState | undefined; onSignIn?: () => void; onLoadMore?: () => void; children: ReactNode; }
export interface AppValueProps { value: JsonValue | undefined; format?: AppValueFormat; currency?: string; }

/** Rows a data component receives once `$state` resolves; anything that is not an array of objects renders as empty. */
export type AppRow = Record<string, JsonValue>;
/** What clicking a row does, when the component has a selectPath or rowAction, and which row is selected now. */
export interface AppRowClick { onRow: ((row: AppRow) => void) | null; selected: AppRow | null; }
