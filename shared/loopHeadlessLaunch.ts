import type { LoopHeadlessLaunchInput } from "./types/loopHeadlessLaunch.types";
import {
  assertLoopHeadlessToolSupported,
  getLoopHeadlessToolCapability
} from "./loopHeadlessCapabilities";

export {
  assertLoopHeadlessToolSupported,
  canRunLoopHeadless,
  describeLoopHeadlessUnsupportedTool,
  getLoopHeadlessToolCapability,
  listLoopHeadlessCapableToolIds,
  LOOP_HEADLESS_TOOL_CAPABILITIES,
  LOOP_HEADLESS_UNSUPPORTED_TOOL_IDS
} from "./loopHeadlessCapabilities";

function quoteShellArgument(value: string, isWindowsPlatform: boolean): string {
  if (isWindowsPlatform) {
    return `"${value.replace(/"/g, "\\\"").replace(/\r?\n/g, " ")}"`;
  }
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function commandHasFlag(command: string, flag: string): boolean {
  return new RegExp(`(?:^|\\s)${flag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s|=|$)`).test(command);
}

function normalizeDetectedCommand(detectedCommand: string): string {
  return detectedCommand.trim();
}

function extractLeadingExecutable(command: string): string {
  const trimmed = command.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (trimmed.startsWith("\"")) {
    const end = trimmed.indexOf("\"", 1);
    return end > 0 ? trimmed.slice(0, end + 1) : trimmed;
  }
  if (trimmed.startsWith("'")) {
    const end = trimmed.indexOf("'", 1);
    return end > 0 ? trimmed.slice(0, end + 1) : trimmed;
  }
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function normalizeCodexBaseCommand(detectedCommand: string): string {
  const trimmed = normalizeDetectedCommand(detectedCommand);
  if (commandHasFlag(trimmed, "--no-alt-screen")) {
    return trimmed;
  }
  return `${trimmed} --no-alt-screen`;
}

function resolveHeadlessCommandBase(toolId: string, detectedCommand: string): string {
  const trimmed = normalizeDetectedCommand(detectedCommand);
  const executable = extractLeadingExecutable(trimmed);
  switch (toolId) {
    case "goose":
      return `${executable} run`;
    case "crush":
      return `${executable} run`;
    case "kilo":
      return `${executable} run`;
    case "rovo":
      return trimmed.includes("rovodev") ? trimmed : `${executable} rovodev run`;
    default:
      return trimmed;
  }
}

export function buildLoopHeadlessShellCommand(input: LoopHeadlessLaunchInput): string {
  assertLoopHeadlessToolSupported(input.toolId, input.roleKind === "writer" ? "Writer" : "Reviewer");
  const capability = getLoopHeadlessToolCapability(input.toolId);
  if (!capability) {
    throw new Error(`Unsupported workflow agent tool: ${input.toolId}`);
  }

  const isWindowsPlatform = input.isWindowsPlatform ?? process.platform === "win32";
  const prompt = quoteShellArgument(input.prompt.trim(), isWindowsPlatform);
  const workspace = quoteShellArgument(input.workspacePath.trim(), isWindowsPlatform);
  const base = resolveHeadlessCommandBase(input.toolId, input.detectedCommand);
  const isReviewer = input.roleKind === "reviewer";

  switch (capability.promptStyle) {
    case "cursor-print-trust": {
      const modeFlag = isReviewer ? " --mode ask" : " --force";
      return `${base} -p --trust --output-format text --workspace ${workspace}${modeFlag} ${prompt}`;
    }
    case "codex-exec": {
      const codexBase = normalizeCodexBaseCommand(base);
      return `${codexBase} exec --json --color never --skip-git-repo-check --dangerously-bypass-approvals-and-sandbox ${prompt}`;
    }
    case "claude-print": {
      const permissionFlag = isReviewer ? "--permission-mode plan" : "--dangerously-skip-permissions";
      return `${base} -p ${permissionFlag} --output-format text ${prompt}`;
    }
    case "gemini-prompt": {
      const approvalFlag = isReviewer ? " --approval-mode plan" : " --approval-mode yolo";
      if (commandHasFlag(base, "--prompt-interactive") || commandHasFlag(base, "-i")) {
        return `${base} --skip-trust --output-format text${approvalFlag} ${prompt}`;
      }
      return `${base} --skip-trust --output-format text --prompt ${prompt}${approvalFlag}`;
    }
    case "print-flag":
      if (input.toolId === "grok") {
        const autoApprove = isReviewer ? "" : " --always-approve";
        return `${base} --no-auto-update -p ${prompt} --output-format text${autoApprove}`;
      }
      return `${base} -p ${prompt}`;
    case "message-flag":
      return `${base} --message ${prompt} --yes-always --no-show-release-notes`;
    case "execute-flag":
      return `${base} -x ${prompt}`;
    case "goose-run":
      return `${base} -t ${prompt} --no-session -q`;
    case "opencode-print":
      return `${base} -p ${prompt} -q`;
    case "copilot-print": {
      const allowTools = isReviewer ? "" : " --allow-tool write --allow-tool shell";
      return `${base} -p ${prompt} -s --no-ask-user${allowTools}`;
    }
    case "cline-yolo": {
      const modeFlag = isReviewer ? " -p" : "";
      return `${base} -y${modeFlag} ${prompt}`;
    }
    case "continue-print": {
      const allowFlags = isReviewer ? "" : " --allow Write --allow Edit --allow Bash";
      return `${base} -p ${prompt} --silent${allowFlags}`;
    }
    case "kilo-run":
      return `${base} --auto ${prompt}`;
    case "crush-run":
      return `${base} --yolo --quiet ${prompt}`;
    case "rovo-run":
      return `${base} --yolo ${prompt}`;
    case "qwen-print": {
      const approvalFlag = isReviewer ? " --approval-mode plan" : " --approval-mode yolo";
      return `${base} -p ${prompt}${approvalFlag}`;
    }
    default:
      throw new Error(`Unsupported workflow prompt style for ${input.toolId}.`);
  }
}
