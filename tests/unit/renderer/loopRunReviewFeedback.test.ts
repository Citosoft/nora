import {
  formatLoopRunReviewWorkItemLabel,
  listLoopRunReviewFeedbackWorkItems
} from "@/components/app/logic/loopRunReviewFeedback";
import type { ForgeOverview, ForgeWorkItemSummary } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

const openPullRequest: ForgeWorkItemSummary = {
  id: "pr-1",
  number: 42,
  title: "Add auth",
  state: "open",
  author: "dev",
  sourceRepository: null,
  sourceBranch: "feature/auth",
  targetBranch: "main",
  updatedAt: "2026-06-10T12:00:00.000Z",
  webUrl: "https://github.com/acme/app/pull/42"
};

const closedPullRequest: ForgeWorkItemSummary = {
  ...openPullRequest,
  id: "pr-2",
  number: 43,
  state: "closed"
};

const openMergeRequest: ForgeWorkItemSummary = {
  ...openPullRequest,
  id: "mr-1",
  number: 7,
  state: "opened",
  sourceRepository: "acme/app",
  webUrl: "https://gitlab.com/acme/app/-/merge_requests/7"
};

test("listLoopRunReviewFeedbackWorkItems returns open pull and merge requests", () => {
  const overview: ForgeOverview = {
    repo: null,
    pullRequests: [closedPullRequest, openPullRequest],
    issues: [],
    workflowRuns: [],
    gitlabUserMergeRequests: [openMergeRequest],
    gitlabUserMergeRequestsErrorMessage: null,
    errorMessage: null
  };

  const items = listLoopRunReviewFeedbackWorkItems(overview);
  assert.deepEqual(items.map((item) => item.number), [42, 7]);
});

test("formatLoopRunReviewWorkItemLabel distinguishes PR and MR labels", () => {
  assert.equal(formatLoopRunReviewWorkItemLabel(openPullRequest), "PR #42 · Add auth");
  assert.equal(formatLoopRunReviewWorkItemLabel(openMergeRequest), "MR #7 · Add auth");
});
