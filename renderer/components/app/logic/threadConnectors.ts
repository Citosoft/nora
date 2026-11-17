import { isSetUpMcpServer } from "@/components/app/logic/mcpServerTable";
import type { McpProviderSource, RuntimeMcpState } from "@/components/app/types/runtimeMcp.types";
import type { ThreadConnectorsDraft, ThreadConnectorsInput, ThreadConnectorsSummary } from "@/components/app/types/threadConnectors.types";

/** Queries only the thread's own provider instance, scoped to its checkout so workspace-configured servers are included. */
export function threadMcpSource({ conversation, providerLabel }: ThreadConnectorsInput): McpProviderSource {
  const { provider, workspace } = conversation;
  return { key: `${provider.kind}:${provider.instanceId}:${workspace.environmentId}:${workspace.checkoutId}`, label: providerLabel, kind: provider.kind,
    selection: { environmentId: workspace.environmentId, providerKind: provider.kind, instanceId: provider.instanceId, workspace } };
}

/** Narrows a provider's MCP discovery to the connectors enabled for the thread: set up and not switched off, sorted by name. */
export function summarizeThreadConnectors(state: RuntimeMcpState): ThreadConnectorsSummary {
  if (state.status === "loading") return state;
  if (state.status === "error") return { status: "unavailable", message: state.message };
  const { result } = state;
  switch (result.kind) {
    case "servers": return { status: "ready", notice: result.notice ?? null,
      servers: result.servers.filter((server) => isSetUpMcpServer(server) && server.status !== "disabled")
        .sort((a, b) => a.name.localeCompare(b.name)) };
    case "unavailable": return { status: "unavailable", message: result.message };
    // A login result only answers a sign-in action, which thread details never sends; treat it as still loading.
    case "login": return { status: "loading" };
  }
}

/**
 * What to discover connectors for: a stored thread's own provider and checkout, or for a draft the provider it will send with,
 * which is the user's pick or, until they pick, the default the model picker resolved (only a pick is saved on the draft).
 */
export function threadConnectorsTarget(conversation: ThreadConnectorsInput["conversation"] | null, draft: ThreadConnectorsDraft): ThreadConnectorsInput["conversation"] | null {
  if (conversation) return conversation;
  const provider = draft.provider ?? draft.readyBinding;
  return provider ? { provider, workspace: draft.workspace } : null;
}
