import type { BrowserWindow, NativeImage } from "electron";
import type { ConversationHeader, ConversationHistoryPage, ConversationSummary, HistoryQuery } from "@shared/types/conversation/queries.types";
import type { EventSubscription } from "@main/types/execution/engine.types";
import type { ConversationInvocation } from "@main/types/execution/gateway.types";
import type { LoopRun } from "@shared/types/loop.types";
import type { AttentionNotice } from "@shared/types/conversation/attention.types";
import type { InboxAlertSource, InboxCommand, InboxConnectorSource, InboxItem, InboxLedger, InboxSnapshot, InboxTarget } from "@shared/types/inbox/inbox.types";
import type { InboxReply } from "@shared/ipc/types/inboxGateway.types";

/** The slice of the execution host the inbox reads; it never executes commands. */
export interface InboxHost {
  subscribe(subscription: EventSubscription): () => void;
  eventCursor(): number;
  summaries(): ConversationSummary[];
  header(conversationId: string): ConversationHeader | null;
  conversationHistory(query: HistoryQuery): ConversationHistoryPage;
}
export interface InboxLedgerStore {
  /** Null when no ledger has been saved yet; throws only for unexpected read failures. */
  read(): InboxLedger | null;
  write(ledger: InboxLedger): void;
}
export interface InboxServiceDeps {
  host: InboxHost;
  ledger: InboxLedgerStore;
  /** Every stored workflow run across the open projects, read once when the inbox starts. */
  listWorkflowRuns(): Promise<LoopRun[]>;
  /** The native workspace a shell project belongs to, if any. */
  workspaceForProject(projectId: string): string | null;
  connectors(): InboxConnectorSource[];
  /** App alerts firing right now. */
  alerts(): InboxAlertSource[];
  now(): string;
  setTimeout(callback: () => void, delayMs: number): { cancel(): void };
}
export interface InboxService {
  snapshot(): InboxSnapshot;
  execute(command: InboxCommand): InboxSnapshot;
  /** Receives every change the snapshot goes through; returns an unsubscribe function. */
  subscribe(listener: (snapshot: InboxSnapshot) => void): () => void;
  observeWorkflowRun(run: LoopRun): void;
  forgetWorkflowRun(runId: string): void;
  /** Re-reads connectors after they change. */
  refreshConnectors(): void;
  refreshAlerts(): void;
  start(): () => void;
}
/** Which inbox items a watcher announces as they arrive. */
export interface InboxArrivalWatch {
  inbox: Pick<InboxService, "snapshot" | "subscribe">;
  select(snapshot: InboxSnapshot): readonly InboxItem[];
}
export interface InboxNotice extends Omit<AttentionNotice, "conversationId"> { target: InboxTarget; }
export interface InboxNotifierDeps {
  inbox: Pick<InboxService, "snapshot" | "subscribe">;
  now(): string;
  /** Whether a desktop notification should be shown now (setting on and the window not focused). */
  shouldNotify(): boolean;
  notify(notice: InboxNotice): void;
  /** Needs-you items that are not snoozed, for the Dock or taskbar badge. */
  setBadge(count: number): void;
}
export interface DesktopInboxDeps {
  inbox: InboxNotifierDeps["inbox"];
  getMainWindow(): BrowserWindow | null;
  getAppIcon(): NativeImage | string | undefined;
  notificationsEnabled(): boolean;
  focusMainWindow(): void;
}
export interface InboxIpcDeps {
  ipc: {
    handle(channel: string, handler: (event: ConversationInvocation, input: unknown) => Promise<InboxReply>): void;
    removeHandler(channel: string): void;
  };
  inbox: Pick<InboxService, "snapshot" | "execute">;
  isAllowedSender(event: ConversationInvocation): boolean;
}
