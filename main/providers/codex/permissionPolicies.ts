import type { CodexPolicy } from "@main/types/execution/codex.types";
import type { PermissionPosture, ProviderPolicy } from "@shared/types/provider/catalog.types";

/** The approval option that allows the action and moves the thread to a policy whose requests Codex's reviewer agent answers. */
export const CODEX_ALLOW_AND_AUTO_REVIEW = "acceptAndAutoReview";

const sandboxPresentation: Readonly<Record<CodexPolicy["sandbox"], { label: string; description: string }>> = {
  "read-only": { label: "Read only", description: "Codex reads files and runs read-only commands without changing the workspace." },
  "workspace-write": { label: "Workspace edits", description: "Codex edits files and runs commands inside this workspace." },
  "danger-full-access": { label: "Full access", description: "Codex can change anything on your computer and use the network." }
};
const approvalDescription: Readonly<Record<CodexPolicy["approvalPolicy"], string>> = {
  untrusted: "It asks before running commands outside a trusted set.",
  "on-request": "It asks when it needs more access.",
  "on-failure": "It asks when a sandboxed command fails.",
  never: "It never asks."
};

function codexPosture(policy: CodexPolicy, auto: boolean): PermissionPosture {
  if (auto) return "auto";
  if (policy.sandbox === "read-only") return "readOnly";
  if (policy.sandbox === "danger-full-access") return "full";
  return "edits";
}

export function codexPermissionPolicy(id: string, policy: CodexPolicy): ProviderPolicy {
  const auto = policy.approvalsReviewer === "auto_review";
  const sandbox = sandboxPresentation[policy.sandbox];
  const approvals = auto ? "A Codex reviewer agent approves or denies requests that would otherwise ask you." : approvalDescription[policy.approvalPolicy];
  return { id, label: `${sandbox.label}${auto ? " · auto-review" : ""}`, description: `${sandbox.description} ${approvals}`, posture: codexPosture(policy, auto) };
}

/** The configured auto-review policy with the same sandbox and approval rules as `current`, when `current` routes requests to the user. */
export function codexAutoReviewPolicy(policies: Readonly<Record<string, CodexPolicy>>, current: CodexPolicy): string | null {
  if (current.approvalsReviewer === "auto_review" || current.approvalPolicy === "never") return null;
  return Object.entries(policies).find(([, policy]) => policy.approvalsReviewer === "auto_review"
    && policy.sandbox === current.sandbox && policy.approvalPolicy === current.approvalPolicy)?.[0] ?? null;
}
