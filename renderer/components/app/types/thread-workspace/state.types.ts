import type { z } from "zod";
import type { threadLayoutSchema, threadDocumentSchema } from "@/components/app/logic/thread-workspace/schema";
import type { ProviderBinding, ConversationCommand, ConversationSource } from "@shared/types/conversation/contracts.types";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { ConversationClient } from "../conversationClient.types";

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
export interface OpenThreadDraft { source?: ConversationSource; workspaceId: string; text?: string; provider?: ProviderBinding; }
export interface ThreadWorkspaceStore {
  readonly client: ConversationClient;
  snapshot(): ThreadWorkspaceSnapshot;
  subscribe(listener: () => void): () => void;
  start(): () => void;
  updateBoot(boot: NativeBoot): void;
  openDraft(input: OpenThreadDraft): string | null;
  openThread(conversationId: string): string | null;
  focusDocument(documentId: string): void;
  focusWorkspace(workspaceId: string): void;
  deactivate(): void;
  setWindowFocused(focused: boolean): void;
  setThreadVisible(visible: boolean): void;
  closeDocument(documentId: string): void;
  discardDraft(documentId: string): void;
  setText(documentId: string, text: string): void;
  setBinding(documentId: string, binding: ProviderBinding | null): void;
  selectWorkspace(documentId: string, workspaceId: string): void;
  togglePin(conversationId: string): void;
  submit(documentId: string): Promise<void>;
  execute(documentId: string, command: ConversationCommand): Promise<void>;
  refresh(): Promise<void>;
}
