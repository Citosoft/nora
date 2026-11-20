import { describe, expect, it } from "vitest";
import type { RemoteBot } from "@shared/types/remote-access/runtimeApi.types";
import { botChatHref, botScopeFromParam, findBot } from "@/state/botChats";
import { createRuntimeClient } from "@/api/runtime/runtimeClient";
import { fakeFetch, json } from "./fixtures/fakeFetch";

const avatar = { seed: 1 };
const global: RemoteBot = { id: "reviewer", name: "Reviewer", role: "Reviews code", avatar, scope: { kind: "global" }, chatConversationId: null };
const scoped: RemoteBot = { ...global, scope: { kind: "workspace", workspaceId: "proj-1" }, chatConversationId: "chat-1" };

describe("bot chats", () => {
  it("opens an existing chat and otherwise the screen that starts one", () => {
    expect(botChatHref("rt", scoped)).toBe("/runtimes/rt/conversations/chat-1");
    expect(botChatHref("rt", global)).toBe("/runtimes/rt/bots/reviewer");
    expect(botChatHref("rt", { ...scoped, chatConversationId: null })).toBe("/runtimes/rt/bots/reviewer?workspaceId=proj-1");
  });

  it("tells a global bot from a workspace bot that shares its id", () => {
    expect(findBot([global, scoped], "reviewer", botScopeFromParam(null))).toBe(global);
    expect(findBot([global, scoped], "reviewer", botScopeFromParam("proj-1"))).toBe(scoped);
    expect(findBot([global], "reviewer", botScopeFromParam("proj-1"))).toBeNull();
  });

  it("reads the runtime's bot list", async () => {
    const { fetch, calls } = fakeFetch(() => json(200, { bots: [global] }));
    const runtime = createRuntimeClient({ hostname: "abc123.remote.withnora.run", fetch, timeoutMs: 50, commandTimeoutMs: 50, getToken: async () => "token" });
    expect(await runtime.bots()).toEqual([global]);
    expect(calls[0]?.url).toBe("https://abc123.remote.withnora.run/v1/bots");
  });
});
