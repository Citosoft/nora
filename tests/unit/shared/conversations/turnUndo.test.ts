import assert from "node:assert/strict";
import test from "node:test";
import { turnUndoAvailability } from "@shared/conversations/turnUndo";
import type { TimelineItem } from "@shared/types/conversation/contracts.types";
import type { TurnUndoState } from "@shared/types/conversation/turnUndo.types";

const at = "2026-11-25T10:00:00.000Z";
const hash = "a".repeat(64);

function review(runId: string, paths: string[], undo?: TurnUndoState): TimelineItem {
  return { kind: "review", id: `${runId}-review`, runId, createdAt: at, ...(undo ? { undo } : {}),
    result: { status: "ready", scope: "turn", attribution: "observed", baselineAt: at, capturedAt: at,
      changes: paths.map((path) => ({ path, kind: "modified" as const, beforeMode: "100644" as const, afterMode: "100644" as const,
        beforeHash: hash, afterHash: hash, patch: null, presentation: "too-large" as const })) } };
}
const idle = [{ state: "completed" as const }];

test("the latest turn and older turns no standing later turn touched can be undone", () => {
  const items = [review("one", ["a.md"]), review("two", ["b.md"]), review("three", ["a.md", "c.md"])];
  assert.deepEqual(turnUndoAvailability(items, idle, "three-review"), { kind: "available" });
  assert.deepEqual(turnUndoAvailability(items, idle, "two-review"), { kind: "available" });
  assert.deepEqual(turnUndoAvailability(items, idle, "one-review"), { kind: "unavailable", reason: "later-turn" });
});

test("undoing the later turn frees the earlier one, and undo state wins over availability", () => {
  const undone: TurnUndoState = { status: "undone", mode: "all", at, restored: ["a.md"], skipped: [] };
  const items = [review("one", ["a.md"]), review("two", ["a.md"], undone)];
  assert.deepEqual(turnUndoAvailability(items, idle, "one-review"), { kind: "available" });
  assert.deepEqual(turnUndoAvailability(items, idle, "two-review"), { kind: "undone" });
  assert.deepEqual(turnUndoAvailability([review("one", ["a.md"], { status: "pending", mode: "all", requestedAt: at })], idle, "one-review"), { kind: "pending" });
  assert.deepEqual(turnUndoAvailability([review("one", ["a.md"], { status: "expired", at })], idle, "one-review"), { kind: "unavailable", reason: "expired" });
});

test("a running turn makes undo wait, and reviews without turn changes offer nothing", () => {
  assert.deepEqual(turnUndoAvailability([review("one", ["a.md"])], [{ state: "running" }], "one-review"), { kind: "unavailable", reason: "busy" });
  assert.deepEqual(turnUndoAvailability([review("one", [])], idle, "one-review"), { kind: "none" });
  assert.deepEqual(turnUndoAvailability([review("one", ["a.md"])], idle, "missing"), { kind: "none" });
});
