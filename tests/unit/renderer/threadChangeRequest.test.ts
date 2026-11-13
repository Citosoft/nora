import assert from "node:assert/strict";
import test from "node:test";
import { describeChangeRequestCreate } from "@/components/app/logic/thread-workspace/changeRequest";
import type { ThreadChangeRequestCreateInput } from "@/components/app/types/threadForge.types";
import type { ForgeBranchChanges } from "@shared/appTypes";

const changes: ForgeBranchChanges = { branch: "feature", baseBranch: "main", provider: "github", files: 2, additions: 8, deletions: 1,
  partial: false, commitsAhead: 1, uncommittedFiles: 0, branches: ["feature", "main"] };
const input = (override: Partial<ForgeBranchChanges> = {}, rest: Partial<ThreadChangeRequestCreateInput> = {}): ThreadChangeRequestCreateInput => ({
  threadBranch: "feature", request: { status: "ready", value: null }, changes: { status: "ready", value: { ...changes, ...override } },
  connections: { github: true, gitlab: true }, ...rest
});

test("offers a PR for GitHub and an MR for GitLab when the branch has commits to propose", () => {
  assert.deepEqual(describeChangeRequestCreate(input()), { kind: "ready", provider: "github", noun: "PR", branch: "feature", baseBranch: "main", branches: ["feature", "main"] });
  const gitlab = describeChangeRequestCreate(input({ provider: "gitlab" }));
  assert.ok(gitlab.kind === "ready" && gitlab.noun === "MR");
});

test("hides creation while an open request exists but allows a new one after it merges", () => {
  const open = { branch: "feature", branchExistsOnRemote: true, state: "open", label: "Open", pullRequestNumber: 4, webUrl: null } as const;
  assert.deepEqual(describeChangeRequestCreate(input({}, { request: { status: "ready", value: open } })), { kind: "hidden" });
  const merged = { ...open, state: "merged", label: "Merged" } as const;
  assert.equal(describeChangeRequestCreate(input({}, { request: { status: "ready", value: merged } })).kind, "ready");
});

test("explains why a change request cannot be created", () => {
  const message = (value: ThreadChangeRequestCreateInput) => {
    const result = describeChangeRequestCreate(value);
    return result.kind === "blocked" ? result : null;
  };
  assert.deepEqual(message(input({}, { connections: { github: false, gitlab: true } })), { kind: "blocked", message: "Connect GitHub to create PRs from threads.", connect: "github" });
  assert.match(message(input({ provider: null }))?.message ?? "", /No GitHub or GitLab remote/);
  assert.match(message(input({ branch: "other" }))?.message ?? "", /moved to other/);
  assert.match(message(input({ branch: "main" }, { threadBranch: "main" }))?.message ?? "", /other than main/);
  assert.match(message(input({ commitsAhead: 0, uncommittedFiles: 3 }))?.message ?? "", /Commit these changes to open a PR/);
  assert.match(message(input({ commitsAhead: 0 }))?.message ?? "", /No commits ahead of main/);
});

test("stays hidden until branch changes load", () => {
  assert.deepEqual(describeChangeRequestCreate(input({}, { changes: { status: "loading" } })), { kind: "hidden" });
});
