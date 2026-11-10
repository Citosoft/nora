import type { ConversationRun, TimelineItem, RuntimeRequest, RequestResponse, ProviderBinding, ConversationCommand } from "@shared/types/conversation/contracts.types";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { ConversationClient } from "./conversationClient.types";
import type { ConversationReview } from "@shared/types/conversation/review.types";
import type { ThreadDocument, ThreadDocumentRuntime } from "./thread-workspace/state.types";

export interface NativeTimelineProps { items: readonly TimelineItem[]; }
export interface NativeReviewProps { result: ConversationReview; }
export interface NativeRequestProps {
  request: RuntimeRequest;
  busy: boolean;
  onRespond(response: RequestResponse): Promise<void>;
}
export interface NativeConversationPorts {
  client: ConversationClient;
  workspace: NativeWorkspace;
  state: NativeBoot;
  document: ThreadDocument;
  runtime: ThreadDocumentRuntime;
  storageError: string | null;
  setText(text: string): void;
  setBinding(binding: ProviderBinding | null): void;
  submit(): Promise<void>;
  execute(command: ConversationCommand): Promise<void>;
  selectWorkspace(workspaceId: string): void;
}
export interface NativeProviderPickerProps {
  state: NativeBoot;
  workspace: NativeWorkspace;
  client: ConversationClient;
  locked: ProviderBinding | null;
  initial: ProviderBinding | null;
  onBinding(binding: ProviderBinding | null): void;
}
export interface NativeQueueProps {
  conversationId: string;
  runs: readonly ConversationRun[];
  paused: boolean;
  busy: boolean;
  execute(command: ConversationCommand): Promise<void>;
}
