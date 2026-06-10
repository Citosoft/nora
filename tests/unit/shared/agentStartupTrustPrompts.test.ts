import {
  createAgentStartupPromptDismissalState,
  normalizeAgentTerminalPlainText,
  resolvePendingAgentStartupPromptDismissal
} from "@shared/agentStartupTrustPrompts";
import assert from "node:assert/strict";
import test from "node:test";

test("normalizeAgentTerminalPlainText strips ansi and collapses whitespace", () => {
  assert.equal(
    normalizeAgentTerminalPlainText("\u001b[31mDo you trust\u001b[0m the contents\nof this directory?"),
    "Do you trust the contents of this directory?"
  );
});

test("resolvePendingAgentStartupPromptDismissal accepts codex trust once", () => {
  const state = createAgentStartupPromptDismissalState();
  const dismissal = resolvePendingAgentStartupPromptDismissal(
    "Do you trust the contents of this directory? 1. Yes, continue",
    state
  );

  assert.deepEqual(dismissal, { inputs: ["1", "\r"] });
  assert.equal(
    resolvePendingAgentStartupPromptDismissal(
      "Do you trust the contents of this directory? 1. Yes, continue",
      state
    ),
    null
  );
});

test("resolvePendingAgentStartupPromptDismissal accepts claude trust with enter", () => {
  const state = createAgentStartupPromptDismissalState();
  const dismissal = resolvePendingAgentStartupPromptDismissal(
    "Quick safety check: Is this a project you created or one you trust?",
    state
  );

  assert.deepEqual(dismissal, { inputs: ["\r"] });
});

test("resolvePendingAgentStartupPromptDismissal accepts cursor workspace trust with enter", () => {
  const state = createAgentStartupPromptDismissalState();
  const dismissal = resolvePendingAgentStartupPromptDismissal(
    "Do you trust the authors of the files in this folder?",
    state
  );

  assert.deepEqual(dismissal, { inputs: ["\r"] });
});
