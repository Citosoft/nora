import type { RuntimeRoute } from "@main/types/remote-access/http/routes.types";
import { RuntimeFailure } from "./failure";

export function matchRuntimeRoute(method: string, pathname: string): RuntimeRoute {
  if (method === "GET") {
    switch (pathname) {
      case "/v1/runtime/info": return { kind: "info" };
      case "/v1/projects": return { kind: "projects" };
      case "/v1/bots": return { kind: "bots" };
      case "/v1/conversations": return { kind: "conversations" };
      case "/v1/tasks": return { kind: "tasks" };
      case "/v1/inbox": return { kind: "inbox" };
      case "/v1/events": return { kind: "events" };
    }
    const match = /^\/v1\/conversations\/([^/]+)(\/timeline)?$/.exec(pathname);
    if (match) return { kind: match[2] ? "timeline" : "conversation", id: decodeURIComponent(match[1]) };
  }
  if (method === "POST") {
    if (pathname === "/v1/conversations") return { kind: "create" };
    if (pathname === "/v1/realtime/ticket") return { kind: "ticket" };
    if (pathname === "/v1/inbox") return { kind: "inbox-command" };
    const send = /^\/v1\/conversations\/([^/]+)\/messages$/.exec(pathname);
    if (send) return { kind: "send", id: decodeURIComponent(send[1]) };
    const decision = /^\/v1\/actions\/([^/]+)\/decision$/.exec(pathname);
    if (decision) return { kind: "decision", id: decodeURIComponent(decision[1]) };
    const botChat = /^\/v1\/bots\/([^/]+)\/chat$/.exec(pathname);
    if (botChat) return { kind: "bot-chat", id: decodeURIComponent(botChat[1]) };
    const cancel = /^\/v1\/tasks\/([^/]+)\/cancel$/.exec(pathname);
    if (cancel) return { kind: "cancel", id: decodeURIComponent(cancel[1]) };
  }
  throw new RuntimeFailure("not-found", "This runtime endpoint does not exist.");
}
