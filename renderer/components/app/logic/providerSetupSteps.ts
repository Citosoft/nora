import type { AgentCatalogEntry } from "@shared/appTypes";
import { isProviderKind } from "@shared/providers/providerKinds";
import type { ProviderSetupStep, ProviderSetupStepsInput } from "@/components/app/types/providerSetup.types";

/** Installed catalog agents that Nora can run as thread providers. */
export function installedProviderAgentIds(catalog: readonly Pick<AgentCatalogEntry, "id" | "detected">[]): string[] {
  return catalog.filter((tool) => tool.detected && isProviderKind(tool.id)).map((tool) => tool.id);
}

/**
 * The first-provider checklist: install, connect, sign in. Sign-in runs through a connected runtime, and the thread
 * leaves this view as soon as one connects, so it is shown as the next step rather than tracked here.
 */
export function providerSetupSteps({ installedAgentIds, checking }: ProviderSetupStepsInput): ProviderSetupStep[] {
  if (!installedAgentIds.length) return [{ id: "install", state: checking ? "checking" : "current" }, { id: "connect", state: "pending" }, { id: "sign-in", state: "pending" }];
  return [{ id: "install", state: "done" }, { id: "connect", state: checking ? "checking" : "current" }, { id: "sign-in", state: "pending" }];
}
