import type {
  ChangeEntry,
  ForgeBranchChanges,
  ForgeBranchPullRequestStatus,
  ForgeCreatePullRequestPayload,
  ForgeProvider,
  ForgeWorkItemDetail,
  ForgeWorkItemSummary
} from "@shared/appTypes";
import type { ThreadBranchDiffTarget } from "./centerDiff.types";

/** Which forge integrations hold credentials, so threads only offer change requests they can open. */
export type ThreadForgeConnections = Record<ForgeProvider, boolean>;

/** Credential-bound forge access for thread surfaces; tokens never leave this client. */
export interface ThreadForgeClient {
  connections: ThreadForgeConnections;
  readIssues(projectId: string): Promise<ForgeWorkItemSummary[]>;
  readBranchRequest(projectId: string, branch: string): Promise<ForgeBranchPullRequestStatus | null>;
  readBranchChanges(projectId: string, checkoutPath: string): Promise<ForgeBranchChanges | null>;
  /** Per-file patches for the same changes `readBranchChanges` counts; null for a detached checkout. */
  readBranchDiff(projectId: string, checkoutPath: string): Promise<ChangeEntry[] | null>;
  createChangeRequest(projectId: string, payload: ForgeCreatePullRequestPayload): Promise<ForgeWorkItemDetail>;
}

export type ThreadReadState<T> =
  | { status: "unavailable" | "loading" }
  | { status: "ready"; value: T }
  | { status: "failed"; message: string };

export type ThreadChangeRequestNoun = "PR" | "MR";

/** Whether the thread's branch can open a change request, and why not when it cannot. */
export type ThreadChangeRequestCreate =
  | { kind: "hidden" }
  | { kind: "ready"; provider: ForgeProvider; noun: ThreadChangeRequestNoun; branch: string; baseBranch: string; branches: string[] }
  | { kind: "blocked"; message: string; connect: ForgeProvider | null };

export interface ThreadChangeRequestCreateInput {
  /** Branch the thread was started on; the checkout must still be on it. */
  threadBranch: string;
  request: ThreadReadState<ForgeBranchPullRequestStatus | null>;
  changes: ThreadReadState<ForgeBranchChanges | null>;
  connections: ThreadForgeConnections;
}

export type ThreadChangeRequestSubmit = Omit<ForgeCreatePullRequestPayload, "sourcePath">;

export interface ThreadBranchInsights {
  request: ThreadReadState<ForgeBranchPullRequestStatus | null>;
  changes: ThreadReadState<ForgeBranchChanges | null>;
  create: ThreadChangeRequestCreate;
  /** The checkout's branch to show in the center diff viewer; null until its changes load. */
  diffTarget: ThreadBranchDiffTarget | null;
  refresh(): void;
  createChangeRequest(payload: ThreadChangeRequestSubmit): Promise<void>;
}
