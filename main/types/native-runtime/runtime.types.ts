import type { NoraWorkerWorkspaces } from "@main/types/nora-tools/workerWorkspaces.types";
import type { NoraSettingsOptions } from "@main/types/nora-tools/operations.types";
import type { ProjectSummary } from "@shared/appTypes";
import type { ExecutionHost } from "@main/execution/host";
import type { PersonalizationService } from "@main/personalization/service";
import type { NoraTaskStore, NoraWorkflowStore } from "@main/types/nora-tools/operations.types";
import type { BotMemoryStore } from "@main/types/bots/memory.types";
import type { MemoryReviewLog } from "@main/types/bots/memoryReview.types";
import type { RoutineScheduler } from "@main/types/bots/routines.types";
import type { DirectContextPreview, DirectContextRequest } from "@shared/ipc/types/directContextGateway.types";
import type { ChatBranchRequest } from "@shared/ipc/types/chatBranchGateway.types";
import type { WorkspaceCatalog } from "@main/types/personalization/services.types";
import type { ConnectorService } from "@main/types/connectors/connectors.types";
import type { Connector } from "@shared/types/connectors/connectors.types";
import type { SecretService } from "@main/types/secrets/secrets.types";
import type { SecretPrompt, VaultSecret } from "@shared/types/secrets/secrets.types";
import type { AppService } from "@main/types/apps/apps.types";
import type { AppBuildStep, AppRenderData, AppSummary } from "@shared/types/apps/apps.types";

export interface NativeRuntimeOptions extends NoraSettingsOptions {
  workerWorkspaces?: NoraWorkerWorkspaces;
  stateDirectory: string;
  personalDirectory: string;
  projects(): readonly ProjectSummary[];
  /** Paths of a project's ready worktrees, offered to threads as extra checkouts. */
  projectCheckouts(projectId: string): readonly string[];
  activateWorkspace(path: string): Promise<void>;
  chooseFolder(): Promise<{ path: string; name: string } | null>;
  openFolder(path: string): Promise<void>;
  /** Task boards for Nora's tools, backed by the workspace service. */
  tasks?: NoraTaskStore;
  onTasksChanged?: (projectId: string) => void;
  /** Workflows for Nora's tools, backed by the app's workflow runner. */
  workflows?: NoraWorkflowStore;
  /** Called with a bot's id whenever its routines or routine runs change. */
  onRoutinesChanged(botId: string): void;
  /** Opens a connector's OAuth sign-in page in the user's browser. */
  openExternal(url: string): Promise<void>;
  /** Called with every connector whenever one's configuration or status changes. */
  onConnectorsChanged(connectors: Connector[]): void;
  /** Called with every secret prompt waiting on the user whenever one opens or closes. */
  onSecretPromptsChanged(prompts: SecretPrompt[]): void;
  /** Called with every saved secret (never values) whenever one is saved or deleted. */
  onSecretVaultChanged(secrets: VaultSecret[]): void;
  /** Called with every app whenever one is created, edited, renamed, trusted or deleted. */
  onAppsChanged(apps: AppSummary[]): void;
  /** Called with an app's render data whenever one of its sources loads or fails. */
  onAppData(data: AppRenderData): void;
  /** Called as a builder thread's tools make progress. */
  onAppBuildStep(step: AppBuildStep): void;
  /** Called whenever an app alert starts or stops firing. */
  onAppAlertsChanged(): void;
}
export interface NativeRuntime {
  host: ExecutionHost;
  personalization: PersonalizationService;
  catalog: WorkspaceCatalog;
  memory: BotMemoryStore;
  memoryReviewLog: MemoryReviewLog;
  routines: RoutineScheduler;
  /** Connectors added in Nora and the gateway threads reach them through. */
  connectors: ConnectorService;
  /** Secrets the user saved for threads to use, and the prompts waiting on them. */
  secrets: SecretService;
  /** Apps built by agents over the user's connectors. */
  apps: AppService;
  /** Starts a side chat off a bot or group chat; see `startChatBranch`. */
  startBranch(request: ChatBranchRequest): Promise<string>;
  /** Names a branch from a message with the simple AI tasks model. */
  nameBranch(message: string): Promise<string>;
  /** What a direct chat's next message would send to its router and work thread; see `previewDirectContext`. */
  previewDirectContext(request: DirectContextRequest): DirectContextPreview;
  /** Stops the host, Nora's tool server and the connector gateway. */
  shutdown(): Promise<void>;
}
