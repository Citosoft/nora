import {
  buildForgeReviewFileInstruction,
  buildForgeReviewInstruction,
  createForgeReviewHandoffRelativePath,
  FORGE_REVIEW_HANDOFF_DIRECTORY,
  getForgeReviewCommentSelections
} from "@/components/app/logic/forgeReviewHandoff";
import type { ForgeWorkItemDetail } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

const detail: ForgeWorkItemDetail = {
  kind: "pull_request",
  item: {
    id: "gitlab-mr-12",
    number: 12,
    title: "Tighten auth validation",
    state: "opened",
    author: "dev",
    sourceRepository: "group/project",
    sourceBranch: "feature/auth",
    targetBranch: "main",
    updatedAt: "2026-06-05T10:00:00.000Z",
    webUrl: "https://gitlab.example.com/group/project/-/merge_requests/12"
  },
  body: "MR body",
  labels: [],
  changes: [
    {
      id: "change-1",
      path: "src/auth.ts",
      previousPath: null,
      additions: 1,
      deletions: 0,
      diff: "@@ -7,2 +7,3 @@\n const input = request.body;\n+validateInput(input);\n return input;"
    }
  ],
  comments: [
    {
      id: "note-1",
      author: "reviewer",
      authorAvatarUrl: null,
      body: "Please make this validation reusable.",
      createdAt: "2026-06-05T10:01:00.000Z",
      threadId: "thread-1",
      path: "src/auth.ts",
      oldLine: null,
      newLine: 8
    },
    {
      id: "note-1-reply",
      author: "maintainer",
      authorAvatarUrl: null,
      body: "Reply in the same thread should not be sent separately.",
      createdAt: "2026-06-05T10:01:30.000Z",
      threadId: "thread-1",
      path: "src/auth.ts",
      oldLine: null,
      newLine: 8
    },
    {
      id: "note-2",
      author: "reviewer",
      authorAvatarUrl: null,
      body: "Top-level note",
      createdAt: "2026-06-05T10:02:00.000Z",
      path: null,
      oldLine: null,
      newLine: null
    }
  ],
  capabilities: {
    supportsInlineComments: true
  },
  canMerge: false,
  canClose: false,
  canReopen: false
};

test("getForgeReviewCommentSelections extracts inline review comments with code context", () => {
  const selections = getForgeReviewCommentSelections(detail);

  assert.equal(selections.length, 1);
  assert.equal(selections[0].commentId, "note-1");
  assert.equal(selections[0].path, "src/auth.ts");
  assert.equal(selections[0].newLine, 8);
  assert.equal(selections[0].lineText, "+validateInput(input);");
  assert.equal(selections[0].body, "Please make this validation reusable.");
});

test("buildForgeReviewInstruction formats selected comments for agent handoff", () => {
  const selections = getForgeReviewCommentSelections(detail);
  const instruction = buildForgeReviewInstruction(detail, selections);

  assert.match(instruction, /merge request #12: Tighten auth validation/);
  assert.match(instruction, /Branches: feature\/auth -> main/);
  assert.match(instruction, /## src\/auth\.ts/);
  assert.match(instruction, /Line 8 \(added\)/);
  assert.match(instruction, /\+validateInput\(input\);/);
  assert.match(instruction, /Please make this validation reusable\./);
});

test("buildForgeReviewFileInstruction points agents at saved handoff files", () => {
  const relativePath = createForgeReviewHandoffRelativePath(detail);
  const instruction = buildForgeReviewFileInstruction({
    detail,
    handoffPath: `/workspace/${relativePath}`,
    selectionCount: 2
  });

  assert.match(
    relativePath,
    new RegExp(`^${FORGE_REVIEW_HANDOFF_DIRECTORY}/forge-review-mr-12-\\d{4}-\\d{2}-\\d{2}T`)
  );
  assert.match(instruction, /Address 2 selected review comments on merge request #12/);
  assert.match(instruction, new RegExp(`/workspace/${FORGE_REVIEW_HANDOFF_DIRECTORY}/forge-review-mr-12-`));
  assert.match(instruction, /Read that file, implement the requested changes/);
});
