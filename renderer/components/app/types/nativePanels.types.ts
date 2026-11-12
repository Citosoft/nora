import type { ConversationRun, TimelineItem, RuntimeRequest, RequestResponse, ProviderBinding, ConversationCommand, ExecutionFailure } from "@shared/types/conversation/contracts.types";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { ConversationClient } from "./conversationClient.types";
import type { ConversationReview } from "@shared/types/conversation/review.types";
import type { ThreadDocument, ThreadDocumentRuntime } from "./thread-workspace/state.types";
import type { BranchRequestReader } from "./threadInsights.types";
import type { ProviderCapabilities } from "@shared/types/provider/capabilities.types";
import type { MarkdownRendererLinkClickHandler } from "./markdownRenderer.types";
import type { ThreadConnectorsState } from "./threadConnectors.types";

export type NativeMessageItem = Extract<TimelineItem, { kind: "message" }>;
export interface NativeMessageProps {
  item: NativeMessageItem;
  onLinkClick?: MarkdownRendererLinkClickHandler;
}
export interface NativeMessageActionsProps {
  item: NativeMessageItem;
}
export interface NativeTimelineProps {
  items: readonly TimelineItem[];
  runs?: readonly ConversationRun[];
  onLinkClick?: MarkdownRendererLinkClickHandler;
  /** The thread's connector discovery, for connector sign-in cards. */
  connectors?: ThreadConnectorsState | null;
}
export interface NativeReviewProps { result: ConversationReview; }
export interface NativeRequestProps {
  request: RuntimeRequest;
  busy: boolean;
  presentation?: "panel" | "dialog";
  onRespond(response: RequestResponse): Promise<void>;
}
export interface NativeRequestStackProps {
  requests: readonly RuntimeRequest[];
  busy: boolean;
  visible: boolean;
  onRespond(requestId: string, response: RequestResponse): Promise<void>;
}
export interface NativeConversationPorts {
  visible: boolean;
  userDisplayName: string;
  readBranchRequest: BranchRequestReader | null;
  client: ConversationClient;
  workspace: NativeWorkspace;
  state: NativeBoot;
  document: ThreadDocument;
  runtime: ThreadDocumentRuntime;
  storageError: string | null;
  latestFailure: ExecutionFailure | null;
  setText(text: string): void;
  setBinding(binding: ProviderBinding | null): void;
  submit(): Promise<void>;
  execute(command: ConversationCommand): Promise<void>;
  compact(): Promise<void>;
  selectWorkspace(workspaceId: string): void;
}
export interface NativeProviderPickerProps {
  state: NativeBoot;
  workspace: NativeWorkspace;
  client: ConversationClient;
  locked: ProviderBinding | null;
  initial: ProviderBinding | null;
  onBinding(binding: ProviderBinding | null): void;
  onCapabilities?(capabilities: ProviderCapabilities | null): void;
}
export interface NativeQueueProps {
  conversationId: string;
  runs: readonly ConversationRun[];
  paused: boolean;
  busy: boolean;
  steerTarget?: string | null;
  execute(command: ConversationCommand): Promise<void>;
}
export interface QueuedInstructionRowProps extends Pick<NativeQueueProps, "conversationId" | "busy" | "execute" | "steerTarget"> {
  run: ConversationRun;
  position: number;
}
