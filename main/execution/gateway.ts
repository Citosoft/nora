import { z } from "zod";
import { gatewayReplySchema, readResultSchema } from "@shared/conversations/gateway";
import type { ExecuteConversationRequest, ReadConversationRequest, ReadConversationResult, WatchConversationRequest, ConversationCursorHint,
  ConversationGatewayReply } from "@shared/ipc/types/conversationGateway.types";
import type { GatewayDependencies, WatchHandle } from "@main/types/execution/gateway.types";
import { ExecutionCommandError } from "./errors";

/** Validates the IPC input immediately and never returns raw transport/provider exceptions. */
export async function conversationReply<T>(schema: z.ZodType<T>, input: unknown,
  work: (request: T) => Promise<Extract<ConversationGatewayReply, { ok: true }>["value"]>): Promise<ConversationGatewayReply> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: { code: "invalid", message: "Conversation request is invalid or uses an unsupported schema" } };
  try { return gatewayReplySchema.parse({ ok: true, value: await work(parsed.data) }); }
  catch (error) {
    return { ok: false, error: error instanceof ExecutionCommandError ? { code: error.code, message: error.message }
      : { code: "unavailable", message: "Conversation execution is unavailable; reconnect to its owning host" } };
  }
}

export class ConversationGateway {
  constructor(private readonly deps: GatewayDependencies) {}
  private host(environmentId: string) {
    const host = this.deps.resolveHost(environmentId);
    if (!host || host.environmentId !== environmentId) throw new ExecutionCommandError("environment", "The owning execution host is unavailable; reconnect to that environment");
    return host;
  }
  execute(request: ExecuteConversationRequest) { return this.host(request.environmentId).execute(request.command); }
  async read(request: ReadConversationRequest): Promise<ReadConversationResult> {
    const host = this.host(request.environmentId);
    let result: ReadConversationResult;
    switch (request.kind) {
      case "header": result = { kind: "header", header: host.header(request.conversationId) }; break;
      case "summaries": result = { kind: "summaries", summaries: host.summaries(request.projectId) }; break;
      case "history": result = { kind: "history", page: host.conversationHistory(request) }; break;
      case "events": result = { kind: "events", page: host.history(request.conversationId, request.after, request.limit) }; break;
      case "catalog": result = { kind: "catalog", result: await host.catalog(request.providerKind, request.instanceId, request.workspace) }; break;
    }
    return readResultSchema.parse(result);
  }
  watch(request: WatchConversationRequest, onCursor: (hint: ConversationCursorHint) => void): WatchHandle {
    const host = this.host(request.environmentId);
    const cursor = host.eventCursor();
    let latest = cursor;
    let pending = false;
    let disposed = false;
    const cancel = host.subscribe({ after: cursor, conversationId: request.conversationId, onError: () => { disposed = true; }, onEvent: (event) => {
      latest = event.cursor;
      if (pending || disposed) return;
      pending = true;
      // Hints coalesce streaming activity; history travels only through bounded pull pages.
      queueMicrotask(() => {
        pending = false;
        if (!disposed) {
          try { onCursor({ schemaVersion: 1, environmentId: request.environmentId, watchId: request.watchId, cursor: latest }); }
          catch { disposed = true; cancel(); }
        }
      });
    } });
    return { receipt: { watchId: request.watchId, cursor }, cancel() { disposed = true; cancel(); } };
  }
}
