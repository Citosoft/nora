import { buildLocalCommitMessageRequest } from "@main/ai/localCommitPrompt";
import type { ChangeEntry } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

function createChange(overrides: Partial<ChangeEntry> & Pick<ChangeEntry, "path">): ChangeEntry {
  return {
    status: "modified",
    additions: 1,
    deletions: 0,
    diff: "+const added = true;\n",
    ...overrides
  };
}

test("buildLocalCommitMessageRequest summarizes many files by churn instead of raw diff", () => {
  const request = buildLocalCommitMessageRequest([
    createChange({ path: "aaa/notice.md", additions: 2, deletions: 0 }),
    createChange({ path: "renderer/settings/AiSettingsSection.tsx", additions: 200, deletions: 40 }),
    createChange({ path: "main/ai/localCommitPrompt.ts", additions: 80, deletions: 0 })
  ]);

  assert.match(request.user, /3 files changed/);
  assert.match(request.user, /Themes: local AI, settings/);
  assert.match(request.user, /AiSettingsSection\.tsx/);
  assert.doesNotMatch(request.user, /Diff context:/);
  assert.doesNotMatch(request.user, /aaa\/notice\.md.*Primary files/s);
});

test("buildLocalCommitMessageRequest includes a short summary for a single-file change", () => {
  const request = buildLocalCommitMessageRequest([
    createChange({
      path: "main/ai/commitMessageGenerator.ts",
      diff: "+export function generateLocalCommitMessage() {}\n"
    })
  ]);

  assert.match(request.user, /1 file changed/);
  assert.match(request.user, /Change summary:/);
  assert.match(request.user, /generateLocalCommitMessage/);
});
