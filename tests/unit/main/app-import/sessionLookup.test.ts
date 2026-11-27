import assert from "node:assert/strict";
import { test } from "node:test";
import { createExternalSessionLookup } from "@main/app-import/sessionLookup";
import type { ExternalSessionReader } from "@main/types/execution/externalSessions.types";

test("external session lookup lists each provider and cwd once through Nora's history readers", async () => {
  const calls: string[] = [];
  const reader: ExternalSessionReader = {
    async list(workspace) {
      calls.push(workspace.path);
      return [{ origin: "cli", id: "s1", providerKind: "claude", instanceId: "claude", cwd: workspace.path, title: "t", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }];
    },
    async read() { throw new Error("not used"); }
  };
  const lookup = createExternalSessionLookup({ claude: reader });
  assert.deepEqual([...await lookup.listSessionIds("claude", "/repo")], ["s1"]);
  assert.deepEqual([...await lookup.listSessionIds("claude", "/repo")], ["s1"]);
  assert.deepEqual([...await lookup.listSessionIds("codex", "/repo")], []);
  assert.deepEqual(calls, ["/repo"]);
});
