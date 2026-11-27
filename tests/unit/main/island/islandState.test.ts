import assert from "node:assert/strict";
import test from "node:test";
import { buildIslandState } from "@main/helpers/island/islandState";
import type { ActiveWorkItem } from "@main/types/desktop-lifecycle/desktopLifecycle.types";
import type { IslandPhase } from "@shared/types/island/island.types";

const identity = { kind: "provider", toolId: "claude", label: "Claude Code", connection: "unknown" } as const;
const thread = (id: string, phase: IslandPhase, activeAt = "2026-11-27T10:00:00Z"): ActiveWorkItem => ({ kind: "thread", title: `Thread ${id}`,
  workspace: `/work/${id}`, status: phase, phase, identity, activeAt, target: { kind: "thread", conversationId: id } });
const work = (items: ActiveWorkItem[]) => ({ items, conversations: items.length, agents: 0, total: items.length });

test("work waiting on the user leads, then running, then queued, the most recently active first within a phase", () => {
  const state = buildIslandState(work([thread("a", "queued"), thread("b", "running", "2026-11-27T09:00:00Z"), thread("c", "waiting"),
    thread("d", "running", "2026-11-27T11:00:00Z")]));
  assert.deepEqual(state.items.map((item) => item.key), ["thread:c", "thread:d", "thread:b", "thread:a"]);
  assert.equal(state.headline, "waiting");
  assert.deepEqual(state.counts, { waiting: 1, running: 2, queued: 1, total: 4 });
  assert.equal(state.items[0]?.workspaceName, "c");
});

test("rows are capped while counts cover all work, and terminal agents get their own keys", () => {
  const agent: ActiveWorkItem = { kind: "terminal-agent", title: "Codex", workspace: "/work/x", status: "Terminal agent running",
    phase: "running", identity, activeAt: "2026-11-27T08:00:00Z", target: { kind: "terminal-agent", agentId: "a1" } };
  const state = buildIslandState(work([...["1", "2", "3", "4", "5", "6"].map((id) => thread(id, "running")), agent]));
  assert.equal(state.items.length, 5);
  assert.equal(state.counts.total, 7);
  assert.equal(buildIslandState(work([agent])).items[0]?.key, "agent:a1");
});

test("no work means no headline and no rows", () => {
  const idle = buildIslandState(work([]));
  assert.equal(idle.headline, null);
  assert.equal(idle.counts.total, 0);
  assert.deepEqual(idle.items, []);
});
