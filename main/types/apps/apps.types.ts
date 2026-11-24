import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { JsonValue } from "@main/jsonValue";
import type { ConnectorService, ConnectorToolAccess } from "@main/types/connectors/connectors.types";
import type { ConversationInvocation } from "@main/types/execution/gateway.types";
import type { AppsReply } from "@shared/ipc/types/appsGateway.types";
import type { AppIcon, AppActionResult, AppActivityEntry, AppBuildStep, AppDefinition, AppRenderData, AppSourceInputs, AppSpec, AppSpecInput, AppSummary, AppVersion } from "@shared/types/apps/apps.types";
import type { Connector, ConnectorSubject } from "@shared/types/connectors/connectors.types";
import type { InboxAlertSource } from "@shared/types/inbox/inbox.types";
import type { AppAlertState } from "./alerts.types";
import type { AppFileSourceReader } from "./fileSource.types";
import type { AppPanelMove } from "@shared/types/apps/panelLayout.types";

/** A raw tool result kept so `select` expressions can be checked against real data when the agent saves a spec. */
export interface AppSample { sourceId: string; sampledAt: string; result: JsonValue; }

export interface AppStore {
  list(): AppSummary[];
  get(id: string): AppDefinition | null;
  /** Inserts a new app or replaces an existing one's definition; every write is also recorded as a version. */
  put(app: AppDefinition, versionSummary: string): void;
  /** Writes fields outside a version (name, trust, owning thread) without recording one. */
  patch(app: AppDefinition): void;
  remove(id: string): void;
  versions(id: string): AppVersion[];
  /** The spec saved as that version, or null when the version is unknown. */
  versionSpec(id: string, version: number): AppSpec | null;
  sample(appId: string, sourceId: string): AppSample | null;
  putSample(appId: string, sample: AppSample): void;
  /** Alerts firing right now, per app and across every app. */
  alertStates(appId: string): AppAlertState[];
  allAlertStates(): { appId: string; state: AppAlertState }[];
  putAlertState(appId: string, state: AppAlertState): void;
  clearAlertState(appId: string, alertId: string): void;
  /** Newest first; older entries beyond the per-app cap are dropped as new ones arrive. */
  activity(appId: string): AppActivityEntry[];
  putActivity(appId: string, entry: Omit<AppActivityEntry, "id">): void;
  close(): void;
}

/** One problem the agent can fix, located by the part of the spec it concerns. */
export interface AppSpecIssue { path: string; message: string; }
export interface AppSpecValidation { spec: AppSpec | null; issues: AppSpecIssue[]; }
export interface AppSpecValidationContext {
  connectors: readonly Connector[];
  /** The cached raw result for a source, when one exists, so its `select` can be evaluated. */
  sample(sourceId: string): JsonValue | undefined;
  /** An imported spec was already checked where it was built, so a source without a sample is only compiled, not evaluated. */
  allowUnsampled?: boolean;
}

export interface AppServiceOptions {
  store: AppStore;
  connectors: ConnectorToolAccess;
  files: AppFileSourceReader;
  nextId(): string;
  now(): string;
  onChanged(apps: AppSummary[]): void;
  onData(data: AppRenderData): void;
  onBuildStep(step: AppBuildStep): void;
  /** Called whenever an alert starts or stops firing, so the Inbox rebuilds. */
  onAlertsChanged(): void;
  /** Interval scheduling, injectable so tests can tick without waiting. */
  timers?: { setInterval(callback: () => void, ms: number): unknown; clearInterval(handle: unknown): void };
}
export interface CreateAppInput { name: string; workspaceId: string; threadId: string | null; spec: AppSpecInput; suggestions?: readonly string[]; icon?: AppIcon; }
/** An omitted icon keeps the app's current one. */
export interface UpdateAppInput {
  id: string;
  /** The version the change was made against; when set, a newer saved version rejects it so edits the caller has not seen are never overwritten. */
  baseVersion?: number;
  spec: AppSpecInput;
  summary: string;
  suggestions?: readonly string[];
  icon?: AppIcon;
}
/** A spec arriving from a file, with its connector ids already replaced by local ones. */
export interface ImportAppInput { name: string; workspaceId: string; spec: AppSpecInput; icon?: AppIcon; }
/** The OS dialogs an export or import goes through; null when the user cancels. */
export interface AppFileDialogs {
  save(fileName: string, text: string): Promise<string | null>;
  open(): Promise<{ path: string; text: string } | null>;
}
/** `appId` is null while the first spec is being written; samples are then keyed by the thread until create_app names the app. */
export interface SampleTarget { appId: string | null; threadId: string; sourceId: string; }
export type SampleInput = SampleTarget & ({ kind: "connector"; connectorId: string; tool: string; args: Record<string, JsonValue>; subject: ConnectorSubject } | { kind: "file"; path: string });
export interface AppService {
  list(): AppSummary[];
  get(id: string): AppDefinition;
  /** Validates the spec; a rejected spec throws with every issue listed so the agent can fix them in one pass. */
  create(input: CreateAppInput): Promise<AppDefinition>;
  update(input: UpdateAppInput): Promise<AppDefinition>;
  /** Saves only a panel move, rejecting stale layouts and keeping live source data intact. */
  movePanel(id: string, version: number, move: AppPanelMove): AppDefinition;
  /** Saves an app read from a file as version 1 with no builder thread; its sources load (and report select problems) as usual. */
  import(input: ImportAppInput): Promise<AppDefinition>;
  /** The connectors apps in a workspace may use, for export descriptions and import matching. */
  connectorsFor(workspaceId: string): readonly Connector[];
  rename(id: string, name: string): void;
  setTrusted(id: string, trusted: boolean): void;
  remove(id: string): void;
  versions(id: string): AppVersion[];
  restoreVersion(id: string, version: number): Promise<AppDefinition>;
  /** The app's current render data, loading any source not yet fetched; sources with bound arguments wait for a refresh that carries inputs. */
  data(id: string): AppRenderData;
  /** Reloads sources; `inputs` are the window's values for bound arguments and are remembered for later interval and action reloads. */
  refresh(id: string, sourceIds?: readonly string[], inputs?: AppSourceInputs): Promise<AppRenderData>;
  /** Fetches a paged source's next page and appends its rows; a source without paging or at its end is left as it is. */
  loadMore(id: string, sourceId: string): Promise<AppRenderData>;
  /** Runs a connector action and records it in the app's activity; `confirmed` says whether the user saw the sheet. */
  runAction(id: string, actionId: string, args: Record<string, JsonValue>, confirmed?: boolean): Promise<AppActionResult>;
  activity(id: string): AppActivityEntry[];
  /** Calls a connector tool once and keeps the result as the sample for `sourceId` of the app being built, returning it for the agent to inspect. */
  sample(input: SampleInput): Promise<JsonValue>;
  /** Binds a builder thread to the app it created, so later turns edit the same app. */
  attachThread(id: string, threadId: string): void;
  /** Reports what a builder thread's tools are doing, for the window's build narration. */
  buildStep(threadId: string, kind: AppBuildStep["kind"], detail?: string): void;
  /** Every alert firing right now, for the Inbox. */
  activeAlerts(): InboxAlertSource[];
  /** Starts background refresh for every saved app's background sources. */
  start(): void;
  watch(id: string): void;
  unwatch(id: string): void;
  close(): void;
}

export interface AppsIpcDeps {
  ipc: {
    handle(channel: string, handler: (event: ConversationInvocation, input: unknown) => Promise<AppsReply>): void;
    removeHandler(channel: string): void;
  };
  apps: AppService;
  connectors: Pick<ConnectorService, "list" | "create" | "remove">;
  installRequests: { get(): string | null; clear(id: string): void };
  files: AppFileDialogs;
  now(): string;
  isAllowedSender(event: ConversationInvocation): boolean;
}

/** The source of an app's builder thread. */
export type AppThreadSource = Extract<NonNullable<Conversation["source"]>, { kind: "app" }>;
