import type { z } from "zod";
import { RUNTIME_ROUTES, commandResponseSchema, conversationDetailResponseSchema, conversationsResponseSchema, eventsResponseSchema,
  projectsResponseSchema, realtimeTicketResponseSchema, runtimeApiErrorSchema, runtimeInfoSchema, tasksResponseSchema,
  timelineResponseSchema } from "@shared/remote-access/runtimeApi";
import type { CommandReceipt } from "@shared/types/conversation/contracts.types";
import type { RuntimeApiErrorCode } from "@shared/types/remote-access/runtimeApi.types";
import type { HttpMethod } from "@/types/http.types";
import type { RuntimeClient, RuntimeClientConfig } from "@/types/runtimeClient.types";
import { requestJson } from "@/api/http/requestJson";
import { runtimeOrigin, runtimeRealtimeOrigin, withQuery } from "./runtimeOrigin";

export function createRuntimeClient(config: RuntimeClientConfig): RuntimeClient {
  const origin = runtimeOrigin(config.hostname);
  const call = <T>(method: HttpMethod, path: string, schema: z.ZodType<T>, body?: object): Promise<T> =>
    requestJson<T, RuntimeApiErrorCode>({
      service: "runtime", method, url: `${origin}${path}`, getToken: config.getToken, fetch: config.fetch,
      timeoutMs: method === "GET" ? config.timeoutMs : config.commandTimeoutMs, schema, errorSchema: runtimeApiErrorSchema,
      ...(body === undefined ? {} : { body })
    });
  const command = async (path: string, body: object): Promise<CommandReceipt> =>
    (await call("POST", path, commandResponseSchema, body)).receipt;

  return {
    origin,
    info: () => call("GET", RUNTIME_ROUTES.info, runtimeInfoSchema),
    projects: async () => (await call("GET", RUNTIME_ROUTES.projects, projectsResponseSchema)).projects,
    conversations: async (query = {}) => {
      const settled = query.settled === undefined ? undefined : String(query.settled);
      const path = withQuery(RUNTIME_ROUTES.conversations, { projectId: query.projectId, settled });
      return (await call("GET", path, conversationsResponseSchema)).conversations;
    },
    conversation: (conversationId) => call("GET", RUNTIME_ROUTES.conversation(conversationId), conversationDetailResponseSchema),
    timeline: async (conversationId, query) =>
      (await call("GET", withQuery(RUNTIME_ROUTES.timeline(conversationId), { before: query.before, limit: query.limit }), timelineResponseSchema)).page,
    tasks: async () => (await call("GET", RUNTIME_ROUTES.tasks, tasksResponseSchema)).tasks,
    events: (query) => call("GET", withQuery(RUNTIME_ROUTES.events, { after: query.after, conversationId: query.conversationId, limit: query.limit }),
      eventsResponseSchema),
    realtimeTicket: () => call("POST", RUNTIME_ROUTES.ticket, realtimeTicketResponseSchema, {}),
    realtimeUrl: (ticket) => `${runtimeRealtimeOrigin(config.hostname)}${withQuery(RUNTIME_ROUTES.realtime, { ticket })}`,
    createConversation: (request) => command(RUNTIME_ROUTES.conversations, request),
    sendMessage: (conversationId, request) => command(RUNTIME_ROUTES.messages(conversationId), request),
    decideAction: (requestId, request) => command(RUNTIME_ROUTES.decision(requestId), request),
    cancelTask: (runId, request) => command(RUNTIME_ROUTES.cancel(runId), request)
  };
}
