import { useMemo, useRef } from "react";
import type { ConversationClient } from "@/components/app/types/conversationClient.types";
import type { McpAppHost } from "@/components/app/types/mcpApp.types";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";

/**
 * What widgets in one thread may ask for. Requests name only the tool item; the host decides which server
 * and resource that item may reach. `draftMessage` is read through a ref so composer re-renders keep the host stable.
 */
export function useMcpAppHost(client: ConversationClient, conversation: { id: string; environmentId: string } | null,
  draftMessage: (text: string) => void): McpAppHost | null {
  const draft = useRef(draftMessage);
  draft.current = draftMessage;
  const conversationId = conversation?.id;
  const environmentId = conversation?.environmentId;
  return useMemo(() => conversationId && environmentId ? {
    open: (itemId) => client.mcpApp({ schemaVersion: 1, environmentId, conversationId, itemId, action: { kind: "open" } }),
    callTool: (itemId, tool, args) => client.mcpApp({ schemaVersion: 1, environmentId, conversationId, itemId,
      action: { kind: "call-tool", tool, arguments: args } }),
    draftMessage: (text) => draft.current(text),
    openLink: (url) => { void noraSystemClient.openExternalUrl(url); }
  } : null, [client, conversationId, environmentId]);
}
