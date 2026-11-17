import { describe, expect, it } from "vitest";
import { createRuntimeSession } from "@/session/runtimeSession";
import type { RealtimeConnection, RealtimeListener } from "@/types/realtime.types";
import type { RuntimeClient } from "@/types/runtimeClient.types";
import type { RuntimeInfo } from "@shared/types/remote-access/runtimeApi.types";
import { event, message } from "./fixtures/conversationFixtures";
import { flush } from "./fixtures/realtimeHarness";

const baseInfo: RuntimeInfo = { apiVersion: 1, runtimeVersion: "3.0.0", name: "Mac", environment: "desktop", environmentId: "env-1",
  capabilities: ["conversations.read", "realtime", "events.replay"], cursor: 77 };

function unused(): never {
  throw new Error("not used in this test");
}

function setup(info: RuntimeInfo | Error) {
  const started: number[] = [];
  let listener: RealtimeListener | null = null;
  const connected: Date[] = [];
  const client: RuntimeClient = {
    origin: "https://abc123.remote.withnora.run",
    info: async () => {
      if (info instanceof Error) throw info;
      return info;
    },
    projects: unused, conversations: unused, conversation: unused, timeline: unused, tasks: unused, events: unused,
    realtimeTicket: unused, realtimeUrl: unused, createConversation: unused, sendMessage: unused, decideAction: unused, cancelTask: unused
  };
  const session = createRuntimeSession({
    runtimeId: "rt", hostname: "abc123.remote.withnora.run", client, now: () => new Date("2026-11-16T10:00:00.000Z"),
    onConnected: (at) => connected.push(at),
    createConnection: (_deps, realtimeListener): RealtimeConnection => {
      listener = realtimeListener;
      return { start: (after) => started.push(after), stop: () => undefined, resume: () => undefined, status: () => ({ kind: "idle" }), cursor: () => 0 };
    }
  });
  return { session, started, connected, emit: () => listener };
}

describe("runtime session", () => {
  it("starts realtime from the runtime's cursor and fans events out to subscribers", async () => {
    const { session, started, connected, emit } = setup(baseInfo);
    const received: number[] = [];
    session.onEvents((events) => received.push(...events.map((entry) => entry.cursor)));
    session.start();
    await flush();
    expect(started).toEqual([77]);
    expect(connected).toHaveLength(1);
    expect(session.getSnapshot()).toMatchObject({ info: { status: "ready" }, liveUpdates: true, compatibility: { compatible: true } });
    emit()?.onEvents([event(78, { kind: "item", item: message("i", "hi") })]);
    expect(received).toEqual([78]);
  });

  it("degrades without realtime when the capability is missing or the API version differs", async () => {
    const noRealtime = setup({ ...baseInfo, capabilities: ["conversations.read"] });
    noRealtime.session.start();
    await flush();
    expect(noRealtime.started).toEqual([]);
    expect(noRealtime.session.getSnapshot().liveUpdates).toBe(false);

    const newer = setup({ ...baseInfo, apiVersion: 2 });
    newer.session.start();
    await flush();
    expect(newer.started).toEqual([]);
    expect(newer.session.getSnapshot().compatibility).toMatchObject({ compatible: false });
  });

  it("reports an unreachable runtime as an error, never as connected", async () => {
    const { session, started, connected } = setup(new Error("offline"));
    session.start();
    await flush();
    expect(session.getSnapshot().info).toMatchObject({ status: "error" });
    expect(started).toEqual([]);
    expect(connected).toEqual([]);
  });
});
