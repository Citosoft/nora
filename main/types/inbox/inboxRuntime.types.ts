import type { LoopRun } from "@shared/types/loop.types";
import type { DesktopInboxDeps, InboxHost, InboxService, InboxServiceDeps } from "./inbox.types";

export interface InboxRuntimeDeps extends Omit<DesktopInboxDeps, "inbox"> {
  host: InboxHost;
  stateDirectory: string;
  /** Shell projects whose workflow runs the inbox follows. */
  projectIds(): string[];
  listWorkflowRuns(projectId: string): Promise<LoopRun[]>;
  workspaceForProject: InboxServiceDeps["workspaceForProject"];
  connectors: InboxServiceDeps["connectors"];
  alerts: InboxServiceDeps["alerts"];
}
export interface InboxRuntime { service: InboxService; stop(): void; }
