import assert from "node:assert/strict";
import test from "node:test";
import { formatForgeIssueInstruction, formatIssueReference, issueReference, parseIssueReference } from "@/components/app/logic/forge-items/issueReference";
import type { ForgeWorkItemDetail } from "@shared/appTypes";

const issue: ForgeWorkItemDetail = {
  kind: "issue",
  item: { id: "github-issue-42", number: 42, title: "Private issue title", state: "open", author: "Daniel", sourceRepository: "team/repo", sourceBranch: null, targetBranch: null, updatedAt: "2026-11-13T10:00:00Z", webUrl: "https://github.com/team/repo/issues/42" },
  body: "Private description that must not be pasted into the instruction.",
  labels: ["private-label"], changes: [],
  comments: [{ id: "comment", author: "reviewer", authorAvatarUrl: null, body: "Private discussion that must not be pasted into the instruction.", createdAt: "2026-11-13T10:00:00Z", path: null, oldLine: null, newLine: null }],
  capabilities: { supportsInlineComments: false },
  canMerge: false, canClose: true, canReopen: false
};

test("fix handoff carries only a tagged issue reference and instructions", () => {
  const prompt = formatForgeIssueInstruction(issue);
  assert.match(prompt, /Fix issue \[#42\]\(<https:\/\/github.com\/team\/repo\/issues\/42> "nora-issue:github"\)/);
  assert.match(prompt, /Read the issue and its discussion/);
  for (const omitted of [issue.item.title, issue.body, issue.comments[0].body, issue.labels[0], issue.item.author]) {
    if (omitted) assert.ok(!prompt.includes(omitted));
  }
});

test("GitLab references support nested repositories and self-hosted instances", () => {
  const detail = { ...issue, item: { ...issue.item, id: "42", webUrl: "https://code.example.com/group/subgroup/repo/-/issues/42" } };
  const reference = issueReference(detail.item);
  assert.equal(reference.provider, "gitlab");
  assert.equal(formatIssueReference(reference), '[#42](<https://code.example.com/group/subgroup/repo/-/issues/42> "nora-issue:gitlab")');
  assert.deepEqual(parseIssueReference(reference.webUrl, "nora-issue:gitlab", "#42"), reference);
});

test("GitHub Enterprise references retain their host and issue identity", () => {
  const detail = { ...issue, item: { ...issue.item, webUrl: "https://github.example.com/team/repo/issues/42" } };
  const reference = issueReference(detail.item);
  assert.equal(reference.provider, "github");
  assert.deepEqual(parseIssueReference(reference.webUrl, "nora-issue:github", "#42"), reference);
});

test("ordinary links and malformed or mismatched tags remain ordinary links", () => {
  const url = issue.item.webUrl;
  for (const [href, title, label] of [
    [url, undefined, "#42"], [url, "nora-issue:other", "#42"],
    [url, "nora-issue:github", "#43"], [url, "nora-issue:github", "#0"],
    [url, "nora-issue:github", "Fix #42"], ["javascript:alert(1)", "nora-issue:github", "#42"],
    ["not a URL", "nora-issue:github", "#42"], [undefined, "nora-issue:github", "#42"],
    ["https://github.com/team/repo/pull/42", "nora-issue:github", "#42"]
  ]) assert.equal(parseIssueReference(href, title, label ?? ""), null);
  assert.throws(() => formatIssueReference({ provider: "github", number: 42, webUrl: "file:///issues/42" }));
});
