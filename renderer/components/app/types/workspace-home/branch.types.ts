import type { ForgeBranchChanges, ForgeBranchPullRequestStatus } from "@shared/appTypes";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { ThreadReadState } from "../threadForge.types";

/** The branch's change request as the home links to it. */
export interface HomeChangeRequest { label: string; webUrl: string | null; state: ForgeBranchPullRequestStatus["state"]; }
/** One short fact about the checkout, such as "2 uncommitted". */
export interface HomeBranchFact { id: "changes" | "uncommitted" | "ahead"; label: string; title: string; }

export interface HomeBranchState {
  request: ThreadReadState<ForgeBranchPullRequestStatus | null>;
  changes: ThreadReadState<ForgeBranchChanges | null>;
}

export interface WorkspaceHomeBranchStatusProps { workspace: NativeWorkspace; }
