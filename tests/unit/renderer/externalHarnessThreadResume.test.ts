import {
  buildExternalHarnessThreadResumeCommand,
  buildExternalHarnessThreadResumePayload
} from "@/components/app/logic/externalHarnessThreadResume";
import type { AgentCatalogEntry, ExternalHarnessSessionSummary } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

function createTool(overrides: Partial<AgentCatalogEntry> = {}): AgentCatalogEntry {
  return {
    id: "codex",
    label: "Codex",
    aliases: [],
    launchCommand: "codex",
    installTemplate: "",
    description: "",
    usageNotes: [],
    authFields: [],
    supportsUsageStatus: false,
    usageDashboardUrl: null,
    supportsAccountSwitch: false,
    detected: true,
    enabled: true,
    detectedCommand: "codex",
    detectedPath: null,
    detectionProbe: null,
    detectionStdout: null,
    detectionStderr: null,
    installStatus: "idle",
    installLog: [],
    config: {
      values: {},
      updatedAt: null
    },
    ...overrides
  };
}

function createThread(overrides: Partial<ExternalHarnessSessionSummary> = {}): ExternalHarnessSessionSummary {
  return {
    toolId: "codex",
    toolLabel: "Codex",
    conversationId: "session-1",
    primaryArtifactPath: "/tmp/session.jsonl",
    sessionLabel: "Codex · session-1",
    threadTitle: "Fix sidebar labels",
    workspacePath: "/tmp/project",
    lastUpdatedAt: "2026-07-20T10:00:00.000Z",
    latestPreview: "Preview",
    entryCount: 2,
    estimate: {
      characters: 100,
      estimatedTokens: 25
    },
    ...overrides
  };
}

test("buildExternalHarnessThreadResumeCommand builds known harness resume commands", () => {
  assert.equal(
    buildExternalHarnessThreadResumeCommand(createThread(), createTool()),
    "codex resume session-1"
  );
  assert.equal(
    buildExternalHarnessThreadResumeCommand(
      createThread({ toolId: "claude", conversationId: "claude-session" }),
      createTool({ id: "claude", detectedCommand: "claude", launchCommand: "claude" })
    ),
    "claude --resume claude-session"
  );
  assert.equal(
    buildExternalHarnessThreadResumeCommand(
      createThread({ toolId: "gemini", conversationId: "gemini-session" }),
      createTool({ id: "gemini", detectedCommand: "gemini", launchCommand: "gemini" })
    ),
    "gemini --resume gemini-session"
  );
  assert.equal(
    buildExternalHarnessThreadResumeCommand(
      createThread({ toolId: "cursor", conversationId: "cursor-session" }),
      createTool({ id: "cursor", detectedCommand: "cursor-agent", launchCommand: "cursor-agent" })
    ),
    "cursor-agent --resume=cursor-session"
  );
});

test("buildExternalHarnessThreadResumePayload carries resume metadata into create-agent", () => {
  const payload = buildExternalHarnessThreadResumePayload(createThread(), createTool(), "Fix sidebar labels");

  assert.equal(payload?.commandOverride, "codex resume session-1");
  assert.equal(payload?.resumeSessionId, "session-1");
  assert.equal(payload?.resumeCommand, "codex resume session-1");
  assert.equal(payload?.contextSelections?.length, 0);
});
