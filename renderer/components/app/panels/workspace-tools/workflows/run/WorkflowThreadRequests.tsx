import { useState } from "react";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { useNativeConversation } from "@/components/app/hooks/useNativeConversation";
import { NativeRequest } from "@/components/app/panels/conversations/NativeRequest";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import type { WorkflowThreadRequestsProps } from "@/components/app/types/workflowSurface.types";

export function WorkflowThreadRequests({ target }: WorkflowThreadRequestsProps) {
  const { store } = useNativeRuntimePorts();
  const { view, error } = useNativeConversation({ client: store.client, conversationId: target.conversationId });
  const [busy, setBusy] = useState(false);
  const [responseError, setResponseError] = useState<string | null>(null);
  const requests = view?.header.pendingRequests.filter((request) => request.status === "pending" || request.status === "responding") ?? [];
  return <section className="space-y-3" aria-label={`${target.stageName} requests`}>
    <div className="flex items-center gap-2 text-sm font-medium">
      {target.bot ? <BotAvatar avatar={target.bot.avatar} size={24} /> : null}
      <span>{target.stageName}{target.bot ? ` · ${target.bot.name}` : ""}</span>
    </div>
    {!view && !error ? <p role="status" className="text-sm text-muted-foreground">Loading stage requests…</p> : null}
    {requests.map((request) => <NativeRequest key={request.id} request={request} busy={busy} onRespond={async (response) => {
      setBusy(true); setResponseError(null);
      try {
        await store.client.execute({ kind: "respond", commandId: crypto.randomUUID(), conversationId: target.conversationId, requestId: request.id, response });
      } catch (cause) { setResponseError(cause instanceof Error ? cause.message : "The response could not be delivered."); }
      finally { setBusy(false); }
    }} />)}
    {error || responseError ? <p role="alert" className="text-sm text-destructive">{responseError ?? error}</p> : null}
  </section>;
}
