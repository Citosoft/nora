import { RUNTIME_CAPABILITIES, runtimeInfoSchema, projectsResponseSchema, botsResponseSchema, conversationsResponseSchema, conversationsQuerySchema,
  conversationDetailResponseSchema, timelineResponseSchema, timelineQuerySchema, tasksResponseSchema, eventsQuerySchema, eventsResponseSchema, inboxResponseSchema } from "@shared/remote-access/runtimeApi";
import { REMOTE_API_VERSION } from "@shared/remote-access/constants";
import type { RuntimeApiOptions } from "@main/types/remote-access/http/runtime.types";
import type { RuntimeRoute } from "@main/types/remote-access/http/routes.types";
import { RuntimeFailure } from "./failure";
import { REMOTE_INBOX_ITEM_KINDS } from "@shared/inbox/contracts";
import { listRemoteBots } from "./botChats";

export function requireRemoteConversation(options: RuntimeApiOptions, id: string) {
  const header = options.host.header(id);
  if (!header || header.conversation.workspace.environmentId !== options.host.environmentId) throw new RuntimeFailure("not-found", "This conversation does not exist on this runtime.");
  return header;
}

/** Validates outbound shapes as well as incoming queries so provider additions cannot leak raw payloads. */
export function readRuntimeRoute(options: RuntimeApiOptions, route: RuntimeRoute, query: URLSearchParams): Response {
  const host = options.host;
  switch (route.kind) {
    case "info": return Response.json(runtimeInfoSchema.parse({ apiVersion: REMOTE_API_VERSION, runtimeVersion: options.runtimeVersion,
      name: options.name(), environment: options.environment, environmentId: host.environmentId, capabilities: RUNTIME_CAPABILITIES, cursor: host.eventCursor() }));
    case "projects": return Response.json(projectsResponseSchema.parse({ projects: options.boot().workspaces.map(({ id, name, kind }) => ({ id, name, kind })) }));
    case "bots": return Response.json(botsResponseSchema.parse({ bots: listRemoteBots(options.boot(), host.summaries()) }));
    case "conversations": {
      const input = conversationsQuerySchema.parse(Object.fromEntries(query));
      const conversations = host.summaries(input.projectId).filter(({ conversation }) => conversation.workspace.environmentId === host.environmentId
        && (input.settled === undefined || !!conversation.archivedAt === (input.settled === "true")));
      return Response.json(conversationsResponseSchema.parse({ conversations }));
    }
    case "conversation": {
      const header = requireRemoteConversation(options, route.id);
      const timeline = host.conversationHistory({ conversationId: route.id, scope: "timeline", limit: 100 });
      return Response.json(conversationDetailResponseSchema.parse({ header, timeline }));
    }
    case "timeline": {
      requireRemoteConversation(options, route.id);
      const input = timelineQuerySchema.parse(Object.fromEntries(query));
      return Response.json(timelineResponseSchema.parse({ page: host.conversationHistory({ ...input, conversationId: route.id, scope: "timeline" }) }));
    }
    case "events": {
      const input = eventsQuerySchema.parse(Object.fromEntries(query));
      if (input.conversationId) requireRemoteConversation(options, input.conversationId);
      return Response.json(eventsResponseSchema.parse(host.history(input.conversationId, input.after, input.limit)));
    }
    case "tasks": {
      const tasks = host.summaries().flatMap(({ conversation }) => {
        if (conversation.workspace.environmentId !== host.environmentId) return [];
        const header = requireRemoteConversation(options, conversation.id);
        return [...header.activeRuns, ...header.queuedRuns].map((run) => ({ conversationId: conversation.id, conversationTitle: conversation.title,
          projectId: conversation.workspace.projectId, run: { id: run.id, state: run.state, createdAt: run.createdAt, updatedAt: run.updatedAt, failure: run.failure },
          label: (run.chatText ?? run.instruction).slice(0, 240), pendingRequestCount: header.pendingRequests.filter((request) => request.runId === run.id).length }));
      });
      return Response.json(tasksResponseSchema.parse({ tasks }));
    }
    case "inbox": return Response.json(inboxResponseSchema.parse({ items: options.inbox.snapshot().items.filter((item) => REMOTE_INBOX_ITEM_KINDS.has(item.kind)) }));
    default: throw new RuntimeFailure("not-found", "This runtime endpoint does not exist.");
  }
}
