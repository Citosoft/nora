import { parseClaudeAssistantUsageLine } from "@main/agent-usage/claudeLocalUsageScan";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("parseClaudeAssistantUsageLine", () => {
  it("returns null for non-assistant records", () => {
    assert.equal(parseClaudeAssistantUsageLine(JSON.stringify({ type: "user" })), null);
  });

  it("parses assistant usage from Claude JSONL shape", () => {
    const line = JSON.stringify({
      type: "assistant",
      sessionId: "sess-1",
      timestamp: "2026-05-01T12:00:00.000Z",
      cwd: "/tmp/proj",
      message: {
        model: "claude-3-5-sonnet-20241022",
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          cache_read_input_tokens: 10,
          cache_creation_input_tokens: 5
        }
      }
    });
    const parsed = parseClaudeAssistantUsageLine(line);
    assert.ok(parsed);
    assert.equal(parsed.sessionId, "sess-1");
    assert.equal(parsed.inputTokens, 100);
    assert.equal(parsed.outputTokens, 50);
    assert.equal(parsed.cacheReadTokens, 10);
    assert.equal(parsed.cacheWriteTokens, 5);
    assert.equal(parsed.cwd, "/tmp/proj");
  });
});
