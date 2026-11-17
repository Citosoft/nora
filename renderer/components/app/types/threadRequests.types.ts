import type { ForgeBranchPullRequestStatus } from "@shared/appTypes";

export interface ThreadRequestTarget { key: string; projectId: string; branch: string; conversationIds: string[]; }
export interface ThreadRequestResults { key: string; requests: Readonly<Record<string, ForgeBranchPullRequestStatus | null>>; }
