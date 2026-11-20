import type { InboxCommand, InboxItem } from "@shared/types/inbox/inbox.types";
import type { IconName } from "./icon.types";

/** The inbox as the app shows it; `full` is false for older computers, which list requests only. */
export interface MobileInbox { items: readonly InboxItem[]; full: boolean; }
export interface MobileInboxSection { id: "needs-you" | "updates" | "snoozed"; title: string; items: readonly InboxItem[]; }

export interface InboxEntryDescription { title: string; detail: string | null; icon: IconName; tone: "default" | "warning" | "danger"; }
export interface InboxEntryRowProps {
  item: Exclude<InboxItem, { kind: "request" }>;
  now: Date;
  onOpen(item: InboxItem): void;
  /** Absent when the computer cannot store marks, so the row offers no read, done or snooze. */
  onCommand?: (command: InboxCommand) => void;
}
