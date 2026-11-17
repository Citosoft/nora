import assert from "node:assert/strict";
import test from "node:test";
import { activeComposerToken, insertComposerToken } from "@/components/app/logic/composerTokens";
import { matchWorkspaceIssues } from "@/components/app/logic/forge-items/issueSuggestions";
import { formatIssueReference, issueReference } from "@/components/app/logic/forge-items/issueReference";
import type { ForgeWorkItemSummary } from "@shared/appTypes";

const issue: ForgeWorkItemSummary = { id: "42", number: 42, title: "Fix login timeout", state: "open", author: "Dan", sourceBranch: null, targetBranch: null, sourceRepository: "team/repo", webUrl: "https://github.com/team/repo/issues/42", updatedAt: "2026-11-13T12:00:00Z" };
const issues = [ { ...issue, id: "421", number: 421, title: "Add sign in" }, issue, { ...issue, id: "7", number: 7, title: "Resolve 42 login failures" } ];

test("hash suggestions open at word boundaries and support number or title queries", () => {
  assert.deepEqual(activeComposerToken("#", 1, "#"), { trigger: "#", start: 0, query: "" });
  assert.deepEqual(activeComposerToken("Fix #42", 7, "#"), { trigger: "#", start: 4, query: "42" });
  assert.deepEqual(activeComposerToken("Fix (#login time", 16, "#"), { trigger: "#", start: 5, query: "login time" });
  assert.equal(activeComposerToken("url#anchor", 10, "#"), null);
  assert.equal(activeComposerToken("#42\nnext", 8, "#"), null);
  assert.equal(activeComposerToken("Fix #42 @Ada", 12, "#"), null);
  const tag = formatIssueReference(issueReference(issue));
  assert.equal(activeComposerToken(tag, tag.length, "#"), null);
});

test("the picker prioritizes exact numbers, then prefixes, then title matches", () => {
  assert.deepEqual(matchWorkspaceIssues(issues, "42").map((item) => item.number), [42, 421, 7]);
  assert.deepEqual(matchWorkspaceIssues(issues, " LOGIN timeout "), [issue]);
  assert.deepEqual(matchWorkspaceIssues(issues, "42 login").map((item) => item.number), [42, 7]);
  assert.deepEqual(matchWorkspaceIssues(issues, ""), issues);
  assert.deepEqual(matchWorkspaceIssues(issues, "missing"), []);
  assert.deepEqual(issues.map((item) => item.number), [421, 42, 7]);
});

test("selecting an issue replaces the query with a tagged reference and preserves following text", () => {
  const text = "Fix #42 then verify";
  const token = activeComposerToken(text, 7, "#");
  assert.ok(token);
  const tag = formatIssueReference(issueReference(issue));
  const next = insertComposerToken(text, token, 7, tag);
  assert.deepEqual(next, { text: `Fix ${tag} then verify`, caret: 4 + tag.length + 1 });
  assert.equal(activeComposerToken(next.text, next.caret, "#"), null);
});

test("multiple references retain their distinct repository URLs and providers", () => {
  const gitlab = { ...issue, id: "gitlab-42", webUrl: "https://gitlab.example.com/group/subgroup/repo/-/issues/42" };
  const first = formatIssueReference(issueReference(issue));
  const text = `${first} and #`;
  const token = activeComposerToken(text, text.length, "#");
  assert.ok(token);
  const next = insertComposerToken(text, token, text.length, formatIssueReference(issueReference(gitlab)));
  assert.ok(next.text.startsWith(first));
  assert.match(next.text, /nora-issue:github/);
  assert.match(next.text, /nora-issue:gitlab/);
  assert.ok(next.text.includes(gitlab.webUrl));
});
