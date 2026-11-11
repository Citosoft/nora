import type { PermissionMode } from "@anthropic-ai/claude-agent-sdk";
import type { ProviderPolicy } from "@shared/types/provider/catalog.types";

const presentation: Readonly<Record<PermissionMode, Pick<ProviderPolicy, "label" | "description">>> = {
  default: { label: "Manual", description: "Ask when an action needs approval. Saved permission rules still apply." },
  auto: { label: "Auto", description: "Claude reviews actions automatically. Requires a supported model and runtime; explicit ask rules still prompt." },
  acceptEdits: { label: "Accept edits", description: "Allow file edits and common file operations; ask about other actions." },
  plan: { label: "Plan", description: "Explore the project and propose a plan before making changes." },
  dontAsk: { label: "Pre-approved only", description: "Allow actions covered by permission rules; deny actions that would require approval." },
  bypassPermissions: { label: "Bypass permissions", description: "Skip routine permission checks." }
};

export function claudePermissionPolicy(id: string, mode: PermissionMode): ProviderPolicy {
  return { id, ...presentation[mode] };
}
