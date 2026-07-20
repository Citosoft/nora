import {
  buildExternalHarnessThreadArchiveKey,
  ExternalHarnessThreadArchiveStore
} from "@main/externalHarnessThreadArchiveStore";
import type { ExternalHarnessContextRef } from "@shared/appTypes";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

function createThreadRef(overrides: Partial<ExternalHarnessContextRef> = {}): ExternalHarnessContextRef {
  return {
    toolId: "codex",
    toolLabel: "Codex",
    conversationId: "session-1",
    primaryArtifactPath: "/tmp/session.jsonl",
    sessionLabel: "Codex session",
    threadTitle: "Fix sidebar threads",
    workspacePath: "/tmp/project",
    ...overrides
  };
}

test("ExternalHarnessThreadArchiveStore persists archived thread keys", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "nora-thread-archive-"));
  const archivePath = path.join(tempRoot, "archive.json");
  const threadRef = createThreadRef();
  const expectedKey = buildExternalHarnessThreadArchiveKey(threadRef);

  await new ExternalHarnessThreadArchiveStore(archivePath).archive(threadRef, "2026-07-20T10:00:00.000Z");

  const keys = await new ExternalHarnessThreadArchiveStore(archivePath).listKeys();
  assert.equal(keys.has(expectedKey), true);
});
