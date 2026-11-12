import { createProviderUpdateEntries, selectDismissedNotices, setProviderUpdateStatus } from "@/components/app/logic/providerUpdateEntries";
import { deriveNoraUpdateState } from "@/components/app/logic/noraUpdateState";
import type { ProviderUpdateNotice } from "@shared/types/provider/update.types";
import assert from "node:assert/strict";
import test from "node:test";

const claude: ProviderUpdateNotice = { toolId: "claude", label: "Claude Code", installedVersion: "2.0.0", latestVersion: "2.1.0" };
const codex: ProviderUpdateNotice = { toolId: "codex", label: "Codex", installedVersion: "0.40.0", latestVersion: "0.45.0" };

test("only providers dismissed without updating surface in the sidebar", () => {
  let entries = createProviderUpdateEntries([claude, codex]);
  assert.deepEqual(selectDismissedNotices(entries), [], "toasts still showing");

  entries = setProviderUpdateStatus(entries, "claude", "dismissed");
  entries = setProviderUpdateStatus(entries, "codex", "updating");
  assert.deepEqual(selectDismissedNotices(entries), [claude]);

  entries = setProviderUpdateStatus(entries, "claude", "updating");
  assert.deepEqual(selectDismissedNotices(entries), []);
});

test("a started update is not demoted by its toast closing afterwards", () => {
  let entries = setProviderUpdateStatus(createProviderUpdateEntries([codex]), "codex", "updating");
  entries = setProviderUpdateStatus(entries, "codex", "dismissed");
  assert.deepEqual(selectDismissedNotices(entries), []);
});

test("Nora update state follows the updater, falling back to a Linux release", () => {
  const linux = { kind: "available" as const, currentVersion: "0.2.2", latestVersion: "0.2.3", updateCommand: "apt", releaseUrl: "https://example.test" };
  assert.equal(deriveNoraUpdateState(null, null), null);
  assert.equal(deriveNoraUpdateState({ kind: "up-to-date", currentVersion: "0.2.2", latestVersion: "0.2.2" }, null), null);
  assert.deepEqual(deriveNoraUpdateState({ kind: "downloaded", currentVersion: "0.2.2", latestVersion: "0.2.3", releaseNotes: null }, null), { phase: "ready", latestVersion: "0.2.3" });
  assert.deepEqual(deriveNoraUpdateState({ kind: "downloading", currentVersion: "0.2.2", latestVersion: "0.2.3", releaseNotes: null }, linux), { phase: "downloading", latestVersion: "0.2.3" });
  assert.deepEqual(deriveNoraUpdateState({ kind: "unsupported", currentVersion: "0.2.2", reason: "linux" }, linux), { phase: "manual", latestVersion: "0.2.3" });
});
