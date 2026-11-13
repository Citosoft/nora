import { createNoraClient } from "./noraClientFactory";

/** Reads archived context and prepares local handoff snapshots; never starts or sends to a legacy agent. */
export const legacyHistoryClient = createNoraClient(["getAgentContextState", "getAgentContextPreview", "listWorkspaceAgentContextSources", "prepareAgentContextHandoff"] as const);
