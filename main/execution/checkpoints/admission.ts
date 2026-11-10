import type { StoreReader } from "@main/types/execution/store.types";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import { workspacesOverlap } from "../workspaceConflict";

/** Keep later Nora starts out of the checkout until evidence from the previous turn is finalized. */
export function hasPendingCheckpointReview(reader: StoreReader, workspace: WorkspaceRef): boolean {
  return reader.checkpointReservations().some((reservation) => workspacesOverlap(reservation, workspace));
}
