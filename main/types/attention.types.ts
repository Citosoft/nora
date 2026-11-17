import type { BrowserWindow, NativeImage } from "electron";
import type { ConversationHeader, ConversationSummary } from "@shared/types/conversation/queries.types";
import type { EventSubscription } from "@main/types/execution/engine.types";
import type { AttentionNotice } from "@shared/types/conversation/attention.types";

export interface AttentionNotifierDeps {
  host: {
    subscribe(subscription: EventSubscription): () => void;
    eventCursor(): number;
    summaries(): ConversationSummary[];
    header(conversationId: string): ConversationHeader | null;
  };
  /** Whether a desktop notification should be shown now (setting on and the window not focused). */
  shouldNotify(): boolean;
  notify(notice: AttentionNotice): void;
  /** Waiting requests across unsettled threads, for the Dock or taskbar badge. */
  setBadge(count: number): void;
}
export interface DesktopAttentionDeps {
  host: AttentionNotifierDeps["host"];
  getMainWindow(): BrowserWindow | null;
  getAppIcon(): NativeImage | string | undefined;
  notificationsEnabled(): boolean;
  focusMainWindow(): void;
}
