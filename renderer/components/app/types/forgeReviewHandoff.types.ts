export interface ForgeReviewCommentSelection {
  commentId: string;
  path: string;
  oldLine: number | null;
  newLine: number | null;
  lineText: string;
  author: string | null;
  body: string;
  createdAt: string;
}

export type ForgeReviewAgentTargetMode = "new-worktree" | "current-branch";
