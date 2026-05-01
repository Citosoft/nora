import { parseCodexUsageLine } from "@main/agent-usage/codexLocalUsageScan";
import type { CodexLocalParseContext } from "@main/types/agent-usage/codexLocalLog.types";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("parseCodexUsageLine", () => {
  it("updates session context from session_meta", () => {
    const ctx: CodexLocalParseContext = {
      sessionId: "file-id",
      sessionCwd: null,
      currentCwd: null,
      currentModel: null,
      previousTotals: null
    };
    const line = JSON.stringify({
      type: "session_meta",
      payload: { id: "real-session", cwd: "/projects/foo" }
    });
    assert.equal(parseCodexUsageLine(line, ctx), null);
    assert.equal(ctx.sessionId, "real-session");
    assert.equal(ctx.sessionCwd, "/projects/foo");
  });

  it("emits token deltas from token_count events", () => {
    const ctx: CodexLocalParseContext = {
      sessionId: "s1",
      sessionCwd: "/projects/foo",
      currentCwd: "/projects/foo",
      currentModel: "gpt-5",
      previousTotals: null
    };
    const line = JSON.stringify({
      type: "event_msg",
      timestamp: "2026-05-01T12:00:00.000Z",
      payload: {
        type: "token_count",
        info: {
          total_token_usage: {
            input_tokens: 20,
            output_tokens: 30,
            cached_input_tokens: 5,
            reasoning_output_tokens: 0,
            total_tokens: 55
          }
        }
      }
    });
    const ev = parseCodexUsageLine(line, ctx);
    assert.ok(ev);
    assert.equal(ev.inputTokens, 20);
    assert.equal(ev.outputTokens, 30);
    assert.equal(ev.cachedInputTokens, 5);
    assert.equal(ev.cwd, "/projects/foo");
  });
});
