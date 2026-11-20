import type { z } from "zod";
import type { inboxAlertItemSchema, inboxCommandSchema, inboxConnectorItemSchema, inboxItemSchema, inboxLedgerSchema, inboxMarkSchema, inboxOutcomeItemSchema, inboxRequestItemSchema,
  inboxSnapshotSchema, inboxTargetSchema, inboxWorkflowItemSchema } from "@shared/inbox/contracts";
import type { Conversation, RuntimeRequest } from "@shared/types/conversation/contracts.types";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { LoopRunStatus } from "@shared/types/loop.types";
import type { Connector } from "@shared/types/connectors/connectors.types";

export type InboxItem = z.infer<typeof inboxItemSchema>;
export type InboxRequestItem = z.infer<typeof inboxRequestItemSchema>;
export type InboxOutcomeItem = z.infer<typeof inboxOutcomeItemSchema>;
export type InboxWorkflowItem = z.infer<typeof inboxWorkflowItemSchema>;
export type InboxConnectorItem = z.infer<typeof inboxConnectorItemSchema>;
export type InboxAlertItem = z.infer<typeof inboxAlertItemSchema>;
export type InboxItemKind = InboxItem["kind"];
export type InboxSnapshot = z.infer<typeof inboxSnapshotSchema>;
export type InboxTarget = z.infer<typeof inboxTargetSchema>;
export type InboxCommand = z.infer<typeof inboxCommandSchema>;
export type InboxMark = z.infer<typeof inboxMarkSchema>;
export type InboxLedger = z.infer<typeof inboxLedgerSchema>;
/** Needs you: waiting on a decision or action and resolved only by acting. Update: news to read, then mark done. */
export type InboxTier = "needs-you" | "update";

/** A request waiting in a thread, with that thread and, for a delegated or group thread, the thread it works for. */
export interface InboxRequestSource { conversation: Conversation; parent: Conversation | null; request: RuntimeRequest; }
/** A workflow run as the inbox needs it; `workspaceId` is null when its project is no longer a native workspace. */
export interface InboxWorkflowSource {
  projectId: string;
  workspaceId: string | null;
  runId: string;
  workflowName: string;
  objective: string;
  status: LoopRunStatus;
  stopReason: string | null;
  updatedAt: string;
}
export type InboxConnectorSource = Pick<Connector, "id" | "name" | "enabled" | "status">;
/** An app alert that is true now: what it reported and when it last started reporting it. */
export interface InboxAlertSource { appId: string; appName: string; workspaceId: string; alertId: string; title: string; detail: string | null; tier: "needs-you" | "update"; firedAt: string; }
export interface InboxSources {
  summaries: readonly ConversationSummary[];
  requests: readonly InboxRequestSource[];
  workflows: readonly InboxWorkflowSource[];
  connectors: readonly InboxConnectorSource[];
  alerts: readonly InboxAlertSource[];
  /** Last agent message per finished run id, when known. */
  previews: ReadonlyMap<string, string | null>;
}
export interface InboxCounts { needsYou: number; unread: number; }
export interface InboxProjection { snapshot: InboxSnapshot; /** Marks of items that no longer exist are dropped. */ marks: InboxLedger["marks"]; }
