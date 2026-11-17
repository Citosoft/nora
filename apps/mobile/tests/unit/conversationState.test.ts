import { describe, expect, it } from "vitest";
import { buildActivityList, conversationsAwaitingDecision } from "@/state/activityList";
import { deriveExecutionState } from "@/state/executionState";
import { capabilityGate, evaluateCompatibility } from "@/state/runtimeCompatibility";
import { buildTimelineEntries } from "@/state/timelineEntries";
import { at, conversation, run, summary } from "./fixtures/conversationFixtures";

const info = { apiVersion: 1, runtimeVersion: "3.0.0", name: "Mac", environment: "desktop" as const, environmentId: "env", capabilities: ["realtime"], cursor: 1 };

describe("conversation state helpers", () => {
  it("derives execution state with pending requests first", () => {
    expect(deriveExecutionState(summary({ latestRun: run("r", "running"), pendingRequestCount: 1 })).kind).toBe("needs-approval");
    expect(deriveExecutionState(summary({ latestRun: run("r", "awaiting-input"), pendingRequestCount: 1 })).kind).toBe("needs-input");
    expect(deriveExecutionState(summary({ latestRun: run("r", "completed"), queuedCount: 2 })).kind).toBe("queued");
    expect(deriveExecutionState(summary({ latestRun: run("r", "failed") })).kind).toBe("failed");
    expect(deriveExecutionState(summary({ latestRun: run("r", "completed") })).label).toBe("Done");
    expect(deriveExecutionState(summary()).kind).toBe("idle");
  });

  it("gates features on API version and capabilities", () => {
    expect(evaluateCompatibility({ ...info, apiVersion: 2 }).compatible).toBe(false);
    expect(capabilityGate(info, "realtime")).toEqual({ enabled: true, reason: null });
    expect(capabilityGate(info, "actions.decide").enabled).toBe(false);
    expect(capabilityGate(null, "realtime").enabled).toBe(false);
  });

  it("merges tasks with latest runs into active and recent activity", () => {
    const later = "2026-11-16T11:00:00.000Z";
    const tasks = [{ conversationId: "conv-2", conversationTitle: "Report", projectId: "proj-1", run: { ...run("r2", "running"), updatedAt: later },
      label: "Write it", pendingRequestCount: 1 }];
    const summaries = [summary({ latestRun: run("r1", "completed") }), summary({ conversation: conversation("conv-2", "Report"), latestRun: run("r2", "queued") })];
    const list = buildActivityList(tasks, summaries);
    expect(list.active.map((entry) => [entry.run.id, entry.label])).toEqual([["r2", "Write it"]]);
    expect(list.recent.map((entry) => entry.run.id)).toEqual(["r1"]);
    expect(conversationsAwaitingDecision(tasks, summaries)).toEqual(["conv-2"]);
  });

  it("nests subagent tool calls under their subagent", () => {
    const entries = buildTimelineEntries([
      { id: "s", runId: "r", createdAt: at, kind: "subagent", label: "Research", nativeId: "agent-1", state: "running" },
      { id: "t1", runId: "r", createdAt: at, kind: "tool", label: "Search", output: "", state: "completed", details: { category: "search", parentId: "agent-1" } },
      { id: "t2", runId: "r", createdAt: at, kind: "tool", label: "Read", output: "", state: "completed" }
    ]);
    expect(entries.map((entry) => entry.kind === "subagent" ? `subagent:${entry.children.map((child) => child.id).join(",")}` : entry.item.id))
      .toEqual(["subagent:t1", "t2"]);
  });
});
