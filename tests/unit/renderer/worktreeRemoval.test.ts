import { canRemoveWorkspaceWorktree } from "@/components/app/logic/worktreeRemoval";
import type {
  RemovableWorktree,
  WorktreeRemovalWorkspace
} from "@/components/app/types/worktreeRemoval.types";
import assert from "node:assert/strict";
import test from "node:test";

const worktree = {
  id: "worktree-1",
  status: "ready"
} satisfies RemovableWorktree;

const workspace = {
  agents: [],
  terminals: []
} satisfies WorktreeRemovalWorkspace;

test("worktree removal allows idle non-root worktrees", () => {
  assert.equal(canRemoveWorkspaceWorktree(workspace, worktree, false), true);
});

test("worktree removal rejects root and removing worktrees", () => {
  assert.equal(canRemoveWorkspaceWorktree(workspace, worktree, true), false);
  assert.equal(canRemoveWorkspaceWorktree(workspace, { ...worktree, status: "removing" }, false), false);
});

test("worktree removal rejects worktrees with attached sessions", () => {
  assert.equal(
    canRemoveWorkspaceWorktree(
      { ...workspace, agents: [{ worktreeId: worktree.id }] },
      worktree,
      false
    ),
    false
  );
  assert.equal(
    canRemoveWorkspaceWorktree(
      { ...workspace, terminals: [{ worktreeId: worktree.id }] },
      worktree,
      false
    ),
    false
  );
});
