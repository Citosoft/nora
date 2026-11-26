import type { z } from "zod";
import type { providerUpdateSchema } from "@main/execution/providerUpdateSchema";
import type { ContextReading, Conversation, ConversationRun, ProviderBinding, RequestResponse, RuntimeRequest } from "@shared/types/conversation/contracts.types";
import type { ExecutionState } from "./store.types";
import type { ProviderCapabilities } from "@shared/types/provider/capabilities.types";
import type { ProviderCatalogResult } from "@shared/types/provider/catalog.types";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { SteeringResult } from "./steering.types";
import type { ExternalSessionReader } from "./externalSessions.types";
import type { ProviderFollowUpSource } from "./followUp.types";

export type ProviderUpdate = z.infer<typeof providerUpdateSchema>;
export type EmitProviderUpdate = (update: ProviderUpdate) => void;
export interface ProviderExecution {
  snapshot: ExecutionState;
  run: ConversationRun;
}
import type { McpAction, McpResult } from "@shared/types/provider/mcp.types";
import type { SkillsResult } from "@shared/types/provider/skills.types";
import type { ProviderAccountAction, ProviderAccountResult } from "@shared/types/provider/account.types";
import type { ProviderMcpAppAction, ProviderMcpAppResult } from "./mcpApp.types";

export interface ExecutionProvider {
  readonly externalSessions?: ExternalSessionReader;
  /** Turns the runtime starts by itself; the host queues each as a `background-task` run that `start` then attaches to. */
  readonly followUps?: ProviderFollowUpSource;
  mcp?(workspace: WorkspaceRef | null, action: McpAction): Promise<McpResult>;
  /** Serves MCP Apps widgets: reads a tool's `ui://` resource or runs a widget's own tool call on the conversation's native session. */
  mcpApp?(conversation: Conversation, action: ProviderMcpAppAction): Promise<ProviderMcpAppResult>;
  /** Lists the skills the runtime offers in a checkout; `refresh` re-scans skill folders. */
  skills?(workspace: WorkspaceRef, refresh: boolean): Promise<SkillsResult>;
  /** Reads or starts sign-in for the runtime's own account, through the runtime's API where it offers one. */
  account?(action: ProviderAccountAction): Promise<ProviderAccountResult>;
  readonly kind: ProviderBinding["kind"];
  readonly instanceId: string;
  readonly capabilities: ProviderCapabilities;
  steer?(execution: ProviderExecution, instruction: string): Promise<SteeringResult>;
  /** Reads the context occupancy of an idle native session from the runtime's saved history; null when unknown. */
  readContext?(conversation: Conversation): Promise<ContextReading | null>;
  catalog(workspace: WorkspaceRef): Promise<ProviderCatalogResult>;
  close(): Promise<void>;
  /** Check the saved attempt again before submitting after asynchronous runtime setup. */
  start(execution: ProviderExecution, emit: EmitProviderUpdate, canStart?: () => boolean): Promise<void>;
  interrupt(execution: ProviderExecution, emit: EmitProviderUpdate): Promise<void>;
  forceInterrupt?(execution: ProviderExecution): Promise<void>;
  respond(execution: ProviderExecution, request: RuntimeRequest, response: RequestResponse, emit: EmitProviderUpdate): Promise<void>;
  reconcile(execution: ProviderExecution, emit: EmitProviderUpdate): Promise<void>;
}
export interface ProviderResolver {
  resolve(kind: ExecutionProvider["kind"], instanceId: string): ExecutionProvider;
}
