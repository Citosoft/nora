import { buildPromptThreadTitle } from "@main/orchestrator/harness-context/promptThreadTitle";
import assert from "node:assert/strict";
import test from "node:test";

test("buildPromptThreadTitle extracts the Cursor user query from its metadata wrapper", () => {
  assert.equal(
    buildPromptThreadTitle(
      "<timestamp>Wednesday, Sep 30, 2026, 10:58 PM (UTC+1)</timestamp>\n<user_query>\nspin me up a copy of espocrm\n</user_query>"
    ),
    "spin me up a copy of espocrm"
  );
});

test("buildPromptThreadTitle strips metadata blocks when no user query wrapper exists", () => {
  assert.equal(buildPromptThreadTitle("<timestamp>Sep 30</timestamp>\nFix the sidebar"), "Fix the sidebar");
});

test("buildPromptThreadTitle returns null for metadata-only prompts", () => {
  assert.equal(buildPromptThreadTitle("<timestamp>Sep 30</timestamp>"), null);
});

test("buildPromptThreadTitle keeps plain prompts unchanged", () => {
  assert.equal(buildPromptThreadTitle("Make the panels lighter."), "Make the panels lighter.");
});
