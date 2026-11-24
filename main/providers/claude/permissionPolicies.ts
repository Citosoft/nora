import type { PermissionMode } from "@anthropic-ai/claude-agent-sdk";
import type { ProviderPolicy } from "@shared/types/provider/catalog.types";

const presentation: Readonly<Record<PermissionMode, Omit<ProviderPolicy, "id">>> = {
  default: { label: "Ask permissions", posture: "ask", description: "Claude asks before editing files or running commands. Saved permission rules still apply." },
  auto: { label: "Auto", posture: "auto", description: "Claude reviews each action itself and asks only when unsure. Needs a supported model; explicit ask rules still prompt." },
  acceptEdits: { label: "Accept edits", posture: "edits", description: "Claude edits files without asking, but asks before running other commands." },
  plan: { label: "Plan", posture: "plan", description: "Claude explores the project and proposes a plan without changing anything." },
  dontAsk: { label: "Pre-approved only", posture: "preapproved", description: "Claude runs actions your permission rules allow and skips anything that would need approval." },
  bypassPermissions: { label: "Full access", posture: "full", description: "Claude runs every action without asking, with full access to your computer." }
};

export function claudePermissionPolicy(id: string, mode: PermissionMode): ProviderPolicy {
  return { id, ...presentation[mode] };
}

/** The approval option that allows the action and moves the session to auto mode. */
export const CLAUDE_ALLOW_AND_AUTO = "allowAndAuto";
/** Modes whose approval prompts can offer the switch: the ones where Claude asks the user about routine actions. */
const AUTO_SWITCH_FROM: ReadonlySet<PermissionMode> = new Set(["default", "acceptEdits"]);

/** The configured policy id for Claude's auto mode, when a prompt raised in `current` mode can switch to it. */
export function claudeAutoSwitchPolicy(policies: Readonly<Record<string, PermissionMode>>, current: PermissionMode): string | null {
  if (!AUTO_SWITCH_FROM.has(current)) return null;
  return Object.entries(policies).find(([, mode]) => mode === "auto")?.[0] ?? null;
}
