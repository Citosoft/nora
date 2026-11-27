import assert from "node:assert/strict";
import test from "node:test";
import { scrubErrorMessage, scrubStack } from "@main/helpers/analytics/scrub";
import { toAnalyticsIdentifier } from "@main/helpers/analytics/identifier";

test("error messages lose paths, addresses, quoted text, IDs and secrets", () => {
  const scrubbed = scrubErrorMessage(
    "ENOENT: open '/Users/jane/clients/acme/contract.md' failed for jane@example.com via https://api.example.com/v1?token=abc " +
    "at C:\\Users\\jane\\file.txt from 10.0.0.12 run 3f2b1c9e-1234-4abc-8def-0123456789ab key sk_" + "live_ABCDEFGHIJKLMNOPQRSTUVWXYZ012345"
  );
  for (const leaked of ["jane", "acme", "contract", "example.com", "token", "10.0.0.12", "3f2b1c9e", "sk_live"]) {
    assert.ok(!scrubbed.includes(leaked), `${leaked} leaked: ${scrubbed}`);
  }
  assert.match(scrubbed, /^ENOENT: open <text> failed for <email> via <url> at <path> from <ip> run <id> key <redacted>$/);
});

test("unix paths outside quotes and long messages are scrubbed and capped", () => {
  assert.equal(scrubErrorMessage("cannot read /home/sam/projects/secret-plan/notes.txt"), "cannot read <path>");
  assert.ok(scrubErrorMessage("x".repeat(20) + " a".repeat(600)).length <= 501);
});

test("stacks keep function and source file names but no directories", () => {
  const stack = [
    "Error: boom",
    "    at runTurn (/Applications/Nora.app/Contents/Resources/app.asar/dist/main/execution/engine.js:120:15)",
    "    at async Promise.all (index 0)",
    "    at file:///Users/jane/dev/nora/dist/main/main.js:10:2",
    "    at handle (C:\\Users\\jane\\AppData\\Local\\Nora\\resources\\app.asar\\dist\\main\\ipc.js:5:9)"
  ].join("\n");
  assert.equal(scrubStack(stack), [
    "at runTurn (engine.js:120:15)",
    "at async Promise.all (index 0)",
    "at main.js:10:2",
    "at handle (ipc.js:5:9)"
  ].join("\n"));
});

test("model names pass through but free text is reported as custom", () => {
  assert.equal(toAnalyticsIdentifier("claude-opus-4-5[1m]"), "claude-opus-4-5[1m]");
  assert.equal(toAnalyticsIdentifier("openai/gpt-5.1"), "openai/gpt-5.1");
  assert.equal(toAnalyticsIdentifier("my private model for Acme Ltd"), "custom");
  assert.equal(toAnalyticsIdentifier(null), null);
});
