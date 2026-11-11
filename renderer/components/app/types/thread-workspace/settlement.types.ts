import type { ReactNode } from "react";
import type { ExternalSessionEntry } from "../externalSessions.types";
import type { ThreadListRow } from "./list.types";

export type ThreadSettlementTarget = { kind: "thread"; conversationId: string } | { kind: "external"; entry: ExternalSessionEntry };
export interface ThreadRowContextMenuProps {
  children: ReactNode;
  row: ThreadListRow;
  onSetSettled?: (row: ThreadListRow, settled: boolean) => void;
}
