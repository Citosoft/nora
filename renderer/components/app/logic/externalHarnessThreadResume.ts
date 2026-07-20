import type { AgentCatalogEntry, CreateAgentPayload, ExternalHarnessSessionSummary } from "@shared/appTypes";

const RESUMABLE_THREAD_TOOL_IDS = new Set(["codex", "claude", "cursor", "gemini"]);

const normalizeResumeSessionId = (value: string): string => value.trim().match(/[A-Za-z0-9._:-]+/)?.[0] || "";

const quoteExecutable = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return /\s/.test(trimmed) ? `"${trimmed.replace(/"/g, "\\\"")}"` : trimmed;
};

const getCommandExecutable = (command: string): string => command.trim().split(/\s+/)[0] || "";

const resolveToolExecutable = (tool: AgentCatalogEntry | null): string | null => {
  if (!tool) {
    return null;
  }

  const detectedPath = tool.detectedPath?.trim();
  if (detectedPath) {
    return quoteExecutable(detectedPath);
  }

  const detectedCommand = getCommandExecutable(tool.detectedCommand ?? "");
  if (detectedCommand) {
    return detectedCommand;
  }

  const launchCommand = getCommandExecutable(tool.launchCommand);
  return launchCommand || null;
};

export const canResumeExternalHarnessThread = (thread: Pick<ExternalHarnessSessionSummary, "toolId" | "conversationId">): boolean =>
  RESUMABLE_THREAD_TOOL_IDS.has(thread.toolId) && normalizeResumeSessionId(thread.conversationId).length > 0;

export const buildExternalHarnessThreadResumeCommand = (
  thread: Pick<ExternalHarnessSessionSummary, "toolId" | "conversationId">,
  tool: AgentCatalogEntry | null
): string | null => {
  const resumeSessionId = normalizeResumeSessionId(thread.conversationId);
  if (!resumeSessionId) {
    return null;
  }

  const executable = resolveToolExecutable(tool);
  if (!executable) {
    return null;
  }

  if (thread.toolId === "codex") {
    return `${executable} resume ${resumeSessionId}`;
  }

  if (thread.toolId === "claude" || thread.toolId === "gemini") {
    return `${executable} --resume ${resumeSessionId}`;
  }

  if (thread.toolId === "cursor") {
    return `${executable} --resume=${resumeSessionId}`;
  }

  return null;
};

export const buildExternalHarnessThreadResumePayload = (
  thread: ExternalHarnessSessionSummary,
  tool: AgentCatalogEntry | null,
  taskLabel: string
): CreateAgentPayload | null => {
  const resumeSessionId = normalizeResumeSessionId(thread.conversationId);
  const resumeCommand = buildExternalHarnessThreadResumeCommand(thread, tool);
  if (!resumeSessionId || !resumeCommand) {
    return null;
  }

  return {
    toolId: thread.toolId,
    name: "",
    task: `Resume ${taskLabel}`,
    commandOverride: resumeCommand,
    mode: "write",
    target: { kind: "root" },
    contextSelections: [],
    launchSource: "dialog",
    resumeSessionId,
    resumeCommand,
    branchCheckout: null,
    worktreeBranch: null,
    prepareWorktree: false,
    prepareCommand: ""
  };
};

