import type { ProviderCatalogResult } from "@shared/types/provider/catalog.types";
import type { NativeProvider } from "@shared/ipc/types/personalizationGateway.types";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";

export const pickerWorkspace: WorkspaceRef = { environmentId: "local", projectId: "personal", checkoutId: "checkout", path: "/personal", branch: "", access: "write" };
export const codexProvider: NativeProvider = { kind: "codex", instanceId: "account", label: "Codex", reportsMcp: true };
export const claudeProvider: NativeProvider = { kind: "claude", instanceId: "account", label: "Claude", reportsMcp: true };
export function pickerCatalog(provider: Pick<NativeProvider, "kind" | "instanceId"> = codexProvider): Extract<ProviderCatalogResult, { status: "available" }> {
  return { status: "available", catalog: { kind: provider.kind, instanceId: provider.instanceId,
    authentication: "present", capabilities: { resume: true, interrupt: true, steering: false, approvals: true, questions: true,
      reasoning: true, attachments: false, turnChanges: true, subagentDetails: false },
    models: [{ id: "first", name: "First model", description: "", reasoningEfforts: ["high"], defaultReasoningEffort: "high" },
      { id: "second", name: "Second model", description: "", reasoningEfforts: [], defaultReasoningEffort: null }],
    policies: [{ id: "read", label: "Read only" }, { id: "write", label: "Workspace writes" }] } };
}

export function deferredCatalog() {
  let complete: ((value: ProviderCatalogResult) => void) | null = null;
  const promise = new Promise<ProviderCatalogResult>((resolve) => { complete = resolve; });
  return { promise, resolve(value: ProviderCatalogResult): void { if (!complete) throw new Error("Deferred catalog was not initialized"); complete(value); } };
}
