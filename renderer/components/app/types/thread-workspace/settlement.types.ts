import type { ReactNode } from "react";
import type { ExternalSessionEntry } from "../externalSessions.types";
import type { ThreadListRow } from "./list.types";

export type ThreadSettlementTarget = { kind: "thread"; conversationId: string } | { kind: "external"; entry: ExternalSessionEntry };
export interface ThreadRowContextMenuProps {
  children: ReactNode;
  row: ThreadListRow;
  onSetSettled?: (row: ThreadListRow, settled: boolean) => void;
  onRename?: (row: ThreadListRow, title: string) => Promise<void>;
  onDiscardDraft?: (row: ThreadListRow) => void;
}
export interface DiscardDraftDialogProps {
  title: string;
  onDiscard(): void;
  onClose(): void;
}
export interface RenameThreadDialogProps {
  /** "group" or "thread", used in the dialog's wording. */
  noun: string;
  title: string;
  onRename(title: string): Promise<void>;
  onClose(): void;
}
