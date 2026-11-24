import type { ThreadListRow } from "./list.types";
import type { WorkspaceAvatarIdentity } from "../workspaceAvatar.types";

export interface BulkSettlementResult {
  completed: string[];
  errors: Record<string, string>;
}
export interface BulkSettlementProgress { processed: number; total: number; }
export interface BulkSettlementInput {
  ids: readonly string[];
  findRow(id: string): ThreadListRow | undefined;
  settle(row: ThreadListRow): Promise<void>;
  onProgress(completed: number): void;
}
export interface BulkSettleDialogProps {
  rows: readonly ThreadListRow[];
  workspaces: ReadonlyMap<string, WorkspaceAvatarIdentity>;
  onSettle(row: ThreadListRow): Promise<void>;
  onClose(): void;
}
