import type { GroupRequest } from "@shared/types/bots/bots.types";
import type { ComposerAttachment } from "@shared/types/agentInput.types";
import type { ThreadSettlementTarget } from "./settlement.types";
import type { ExternalSession } from "@shared/types/conversation/externalSessions.types";
import type { z } from "zod";
import type { threadLayoutSchema, threadDocumentSchema } from "@/components/app/logic/thread-workspace/schema";
import type { ProviderBinding, ConversationCommand, ConversationSource } from "@shared/types/conversation/contracts.types";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { ConversationClient } from "../conversationClient.types";
import type { BindingOrigin } from "../modelPicker.types";

export type ThreadLayout = z.infer<typeof threadLayoutSchema>;
export type ThreadDocument = z.infer<typeof threadDocumentSchema>;
export interface ThreadDocumentRuntime { busy: boolean; readyBinding: ProviderBinding | null; error: string | null; }
export interface ThreadWorkspaceSnapshot {
  boot: NativeBoot;
  focusRevision: number;
  unreadThreadIds: readonly string[];
  layout: ThreadLayout;
  summaries: readonly ConversationSummary[];
  runtime: Readonly<Record<string, ThreadDocumentRuntime>>;
  loading: boolean;
  error: string | null;
  storageError: string | null;
}
export interface ThreadLayoutPersistence { read(): ThreadLayout | null; write(layout: ThreadLayout): void; }
export interface ThreadWorkspaceDeps {
  boot: NativeBoot;
  client: ConversationClient;
  persistence: ThreadLayoutPersistence;
  nextId(): string;
  now(): string;
}
export interface OpenThreadDraft { source?: ConversationSource; workspaceId: string; text?: string; provider?: ProviderBinding; direct?: { botId: string }; group?: GroupRequest; }
export interface ThreadWorkspaceStore {
  addThreadReference(documentId: string, conversationId: string): Promise<void>;
  removeThreadReference(documentId: string, referenceId: string): void;
  readonly client: ConversationClient;
  setSettled(target: ThreadSettlementTarget, settled: boolean): Promise<void>;
  /** Retitles a stored thread; rejects with a user-meaningful message. */
  renameThread(conversationId: string, title: string): Promise<void>;
  resumeExternal(workspaceId: string, session: ExternalSession): Promise<void>;
  /** Imports an outside thread and pins it without opening a tab. */
  pinExternal(workspaceId: string, session: ExternalSession): Promise<void>;
  snapshot(): ThreadWorkspaceSnapshot;
  subscribe(listener: () => void): () => void;
  start(): () => void;
  updateBoot(boot: NativeBoot): void;
  openDraft(input: OpenThreadDraft): string | null;
  openThread(conversationId: string): string | null;
  /** Opens the bot's direct chat, or a draft of it when the user has not messaged the bot yet. */
  openDirect(workspaceId: string, botId: string): string | null;
  focusDocument(documentId: string): void;
  focusWorkspace(workspaceId: string): void;
  deactivate(): void;
  showHome(): void;
  setWindowFocused(focused: boolean): void;
  setThreadVisible(visible: boolean): void;
  closeDocument(documentId: string): void;
  discardDraft(documentId: string): void;
  addAttachments(documentId: string, attachments: readonly ComposerAttachment[]): void;
  removeAttachment(documentId: string, attachmentId: string): void;
  setText(documentId: string, text: string): void;
  /** Every binding becomes the send-ready binding; only a chosen one is saved with the draft. */
  setBinding(documentId: string, binding: ProviderBinding | null, origin: BindingOrigin): void;
  selectWorkspace(documentId: string, workspaceId: string): void;
  /** Chooses the bot a new thread runs as; null talks to Nora. */
  togglePin(conversationId: string): void;
  setPinned(conversationId: string, pinned: boolean): void;
  submit(documentId: string): Promise<void>;
  /** Commands other than instructions; `submit` is reserved for the composer's saved-instruction flow. */
  execute(documentId: string, command: ConversationCommand): Promise<void>;
  compact(documentId: string): Promise<void>;
  refresh(): Promise<void>;
}
