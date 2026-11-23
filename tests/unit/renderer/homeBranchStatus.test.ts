import assert from "node:assert/strict";
import test from "node:test";
import { describeHomeBranchFacts, describeHomeChangeRequest } from "@/components/app/logic/workspace-home/branchStatus";
import type { ForgeBranchChanges, ForgeBranchPullRequestStatus } from "@shared/appTypes";

const changes = (overrides: Partial<ForgeBranchChanges> = {}): ForgeBranchChanges => ({ branch: "feature", baseBranch: "main", provider: "github",
  files: 0, additions: 0, deletions: 0, partial: false, commitsAhead: 0, uncommittedFiles: 0, branches: ["main"], ...overrides });
const request = (overrides: Partial<ForgeBranchPullRequestStatus> = {}): ForgeBranchPullRequestStatus => ({ branch: "feature", branchExistsOnRemote: true,
  state: "open", label: "Open", pullRequestNumber: 42, webUrl: "https://example.com/pr/42", ...overrides });

test("change request uses the provider's noun and is absent without a number", () => {
  assert.deepEqual(describeHomeChangeRequest(request(), "github"), { label: "PR #42 · Open", webUrl: "https://example.com/pr/42", state: "open" });
  assert.equal(describeHomeChangeRequest(request({ label: "Merged", state: "merged" }), "gitlab")?.label, "MR #42 · Merged");
  assert.equal(describeHomeChangeRequest(request({ pullRequestNumber: null, label: "No pull request" }), "github"), null);
  assert.equal(describeHomeChangeRequest(null, "github"), null);
});

test("branch facts skip zeros and name the base branch", () => {
  assert.deepEqual(describeHomeBranchFacts(changes()), []);
  const facts = describeHomeBranchFacts(changes({ files: 3, additions: 12, deletions: 4, uncommittedFiles: 1, commitsAhead: 2, partial: true }));
  assert.deepEqual(facts.map((fact) => fact.label), ["3 files +12+ −4", "1 uncommitted", "2 commits ahead"]);
  assert.equal(facts[2].title, "2 commits ahead of main");
  assert.equal(describeHomeBranchFacts(changes({ commitsAhead: 1, baseBranch: null }))[0].title, "1 commit ahead of the default branch");
});
