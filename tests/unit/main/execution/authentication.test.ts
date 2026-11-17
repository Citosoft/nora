import assert from "node:assert/strict";
import test from "node:test";
import { normalizeClaudeAuthentication } from "@main/providers/claude/authentication";

test("Claude's none metadata source is not evidence of available credentials", () => {
  assert.equal(normalizeClaudeAuthentication({ apiProvider: "firstParty", tokenSource: "none", apiKeySource: "none" }), "required");
  assert.equal(normalizeClaudeAuthentication({ tokenSource: "none", apiKeySource: "none" }), "unknown");
  assert.equal(normalizeClaudeAuthentication({ apiProvider: "bedrock" }), "unknown");
});

test("a configured source reports presence without copying account details or asserting model access", () => {
  assert.equal(normalizeClaudeAuthentication({ apiKeySource: "environment", email: "private@example.test", organization: "private" }), "present");
});
