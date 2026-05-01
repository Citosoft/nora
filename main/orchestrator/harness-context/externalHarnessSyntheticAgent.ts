import type { AgentSession, ExternalHarnessContextRef } from "@shared/appTypes";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";

export const buildExternalHarnessSourceAgentId = (ref: Pick<ExternalHarnessContextRef, "toolId" | "primaryArtifactPath">): string => {
  const hash = createHash("sha256")
    .update(ref.toolId)
    .update("\0")
    .update(ref.primaryArtifactPath)
    .digest("hex")
    .slice(0, 24);
  return `external-harness:${ref.toolId}:${hash}`;
};

export const buildSyntheticExternalHarnessAgent = (options: {
  ref: ExternalHarnessContextRef;
  projectId: string;
  worktreeId: string;
}): AgentSession => {
  const { ref, projectId, worktreeId } = options;
  const id = buildExternalHarnessSourceAgentId(ref);
  const contextFilePath = path.join(os.tmpdir(), "nora-external-harness", id, "context.md");
  const terminalStreamPath = path.join(os.tmpdir(), "nora-external-harness", id, "terminal.log");
  const resume = ref.conversationId.trim().length > 0 ? ref.conversationId.trim() : null;

  return {
    id,
    projectId,
    sessionId: "external-harness",
    worktreeId,
    mode: "write",
    name: ref.sessionLabel,
    toolId: ref.toolId,
    toolLabel: ref.toolLabel,
    status: "running",
    workspace: ref.workspacePath,
    branch: "",
    host: "local",
    task: "",
    command: "",
    pid: null,
    lastEventAt: new Date(0).toISOString(),
    lastTerminalLine: "",
    resumeSessionId: resume,
    resumeCommand: null,
    contextFilePath,
    terminalStreamPath,
    isBusy: false,
    busyUntil: null,
    terminalOutput: [],
    rawTerminalOutput: "",
    changeSummary: null
  };
};
