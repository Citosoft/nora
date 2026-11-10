import { createNoraClient } from "./noraClientFactory";

/** Read-only access to archived v2 context. Never starts or sends to a legacy agent. */
export const legacyHistoryClient = createNoraClient(["getAgentContextState", "getAgentContextPreview", "listWorkspaceAgentContextSources"] as const);
