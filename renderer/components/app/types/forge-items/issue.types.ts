import type { ForgeProvider, ForgeWorkItemDetail } from "@shared/appTypes";
import type { ForgeDetailPanelProps } from "../panel.types";

export interface IssueReference { provider: ForgeProvider; number: number; webUrl: string; }
export type IssueDetailPanelProps = Pick<ForgeDetailPanelProps,
  "detailLoading" | "detailErrorMessage" | "actionLoading" | "commentLoading" | "repoFullName" |
  "onBackToList" | "onRefreshDetail" | "onOpenUrl" | "onAction" | "onCommentSubmit" | "onStartIssueThread"
> & { detail: ForgeWorkItemDetail; };
export type IssueDiscussionProps = Pick<IssueDetailPanelProps, "detail" | "commentLoading" | "onCommentSubmit">;
export interface IssueReferencePillProps { reference: IssueReference; }
