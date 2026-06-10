import type { LoopHeadlessToolCapability } from "./types/loopHeadlessCapabilities.types";

export const LOOP_HEADLESS_TOOL_CAPABILITIES: readonly LoopHeadlessToolCapability[] = [
  { toolId: "codex", promptStyle: "codex-exec" },
  { toolId: "claude", promptStyle: "claude-print" },
  { toolId: "gemini", promptStyle: "gemini-prompt" },
  { toolId: "pi", promptStyle: "print-flag" },
  { toolId: "cursor", promptStyle: "cursor-print-trust" },
  { toolId: "aider", promptStyle: "message-flag" },
  { toolId: "goose", promptStyle: "goose-run" },
  { toolId: "qwen", promptStyle: "qwen-print" },
  { toolId: "opencode", promptStyle: "opencode-print" },
  { toolId: "grok", promptStyle: "print-flag" },
  { toolId: "copilot", promptStyle: "copilot-print" },
  { toolId: "cline", promptStyle: "cline-yolo" },
  { toolId: "continue", promptStyle: "continue-print" },
  { toolId: "amp", promptStyle: "execute-flag" },
  { toolId: "kilo", promptStyle: "kilo-run" },
  { toolId: "crush", promptStyle: "crush-run" },
  { toolId: "rovo", promptStyle: "rovo-run" }
] as const;

export const LOOP_HEADLESS_UNSUPPORTED_TOOL_IDS = [
  "antigravity",
  "codebuff",
  "kiro",
  "aug",
  "autohand",
  "droid",
  "kimi",
  "mistral-vibe",
  "hermes",
  "openclaw"
] as const;

const capabilityByToolId = new Map(LOOP_HEADLESS_TOOL_CAPABILITIES.map((entry) => [entry.toolId, entry]));

export function getLoopHeadlessToolCapability(toolId: string): LoopHeadlessToolCapability | null {
  return capabilityByToolId.get(toolId) ?? null;
}

export function canRunLoopHeadless(toolId: string): boolean {
  return capabilityByToolId.has(toolId);
}

export function listLoopHeadlessCapableToolIds(): readonly string[] {
  return LOOP_HEADLESS_TOOL_CAPABILITIES.map((entry) => entry.toolId);
}

export function assertLoopHeadlessToolSupported(toolId: string, roleName: string): void {
  if (canRunLoopHeadless(toolId)) {
    return;
  }
  throw new Error(
    `${roleName} uses ${toolId}, which does not expose a supported headless or upfront prompt mode for workflow runs yet.`
  );
}

export function describeLoopHeadlessUnsupportedTool(toolId: string): string {
  return `${toolId} does not expose a supported headless or upfront prompt mode for workflow runs yet.`;
}
