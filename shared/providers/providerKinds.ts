import { z } from "zod";

/** Providers with a dedicated native runtime adapter (Claude Agent SDK, Codex app-server). */
export const NATIVE_PROVIDER_KINDS = ["claude", "codex"] as const;

/**
 * Providers driven through the Agent Client Protocol. Kinds are agent catalog ids so icons, labels and
 * detection come from the catalog; launch specs live with the ACP adapter.
 */
export const ACP_PROVIDER_KINDS = [
  "pi", "cursor", "goose", "qwen", "opencode", "antigravity", "grok", "copilot",
  "cline", "amp", "kilo", "kiro", "aug", "autohand", "droid", "kimi", "mistral-vibe"
] as const;

/** Every runtime provider Nora can drive. Widening is backward compatible with stored conversations; narrowing is not. */
export const PROVIDER_KINDS = [...NATIVE_PROVIDER_KINDS, ...ACP_PROVIDER_KINDS] as const;
export const providerKindSchema = z.enum(PROVIDER_KINDS);

const acpKinds: ReadonlySet<string> = new Set(ACP_PROVIDER_KINDS);
export function isAcpProviderKind(kind: string): kind is (typeof ACP_PROVIDER_KINDS)[number] {
  return acpKinds.has(kind);
}

const providerKinds: ReadonlySet<string> = new Set(PROVIDER_KINDS);
export function isProviderKind(kind: string): kind is (typeof PROVIDER_KINDS)[number] {
  return providerKinds.has(kind);
}
