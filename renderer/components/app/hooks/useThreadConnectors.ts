import { useMemo } from "react";
import { useRuntimeMcpCatalog } from "@/components/app/hooks/useRuntimeMcpCatalog";
import { summarizeThreadConnectors, threadMcpSource } from "@/components/app/logic/threadConnectors";
import type { ConversationClient } from "@/components/app/types/conversationClient.types";
import type { McpProviderSource } from "@/components/app/types/runtimeMcp.types";
import type { ThreadConnectorsInput, ThreadConnectorsState } from "@/components/app/types/threadConnectors.types";

const NO_SOURCES: readonly McpProviderSource[] = [];

/**
 * Discovers the MCP connectors enabled for a thread from the provider runtime that thread is bound to.
 * Returns null until a thread is loaded, so the conversation panel can own one discovery shared by every connector surface.
 */
export function useThreadConnectors(client: Pick<ConversationClient, "mcp">, input: ThreadConnectorsInput | null): ThreadConnectorsState | null {
  const provider = input?.conversation.provider;
  const workspace = input?.conversation.workspace;
  const providerLabel = input?.providerLabel;
  // Keyed on the fields that select the runtime and checkout, so streaming header updates do not re-query the runtime.
  const sources = useMemo(() => provider && workspace && providerLabel !== undefined
    ? [threadMcpSource({ conversation: { provider, workspace }, providerLabel })] : NO_SOURCES,
  [provider?.kind, provider?.instanceId, workspace?.environmentId, workspace?.checkoutId, workspace?.path, providerLabel]);
  const { entries, refresh, logins } = useRuntimeMcpCatalog(client, sources);
  const entry = entries[0];
  const summary = useMemo(() => entry ? summarizeThreadConnectors(entry.state) : { status: "loading" as const }, [entry]);
  return useMemo(() => sources[0] ? { source: sources[0], summary, logins, refresh } : null, [sources, summary, logins, refresh]);
}
