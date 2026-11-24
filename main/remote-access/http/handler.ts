import { runtimeBodyLimit } from "@shared/remote-access/attachments";
import { uploadRemoteAttachment } from "./attachments";
import { updateRemoteManagement } from "./management";
import { NORA_RELAY_NAME, REMOTE_CLIENT_HEADER } from "@shared/remote-access/constants";
import { realtimeTicketResponseSchema } from "@shared/remote-access/runtimeApi";
import type { RuntimeApi, RuntimeApiOptions } from "@main/types/remote-access/http/runtime.types";
import { bearerToken } from "../auth";
import { RuntimeFailure, describeRuntimeFailure } from "./failure";
import { createRealtimeTickets } from "./tickets";
import { createRuntimeRateLimit } from "./rateLimit";
import { matchRuntimeRoute } from "./routes";
import { readRuntimeRoute } from "./readRoutes";
import { executeRemoteCommand } from "./commands";
import { applyRemoteInboxCommand } from "./inbox";
import { describeRemoteClient } from "./clientLabel";

async function readJson(request: Request, maxBytes: number): Promise<unknown> {
  if (request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new RuntimeFailure("invalid", "Send a JSON request body.");
  const reader = request.body?.getReader();
  if (!reader) throw new RuntimeFailure("invalid", "Send a JSON request body.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new RuntimeFailure("too-large", "This request is too large."); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  const input: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  return input;
}

export function createRuntimeApi(options: RuntimeApiOptions): RuntimeApi {
  const tickets = createRealtimeTickets(options.now);
  const allow = createRuntimeRateLimit(options.now);
  const incoming = createRuntimeRateLimit(options.now, 600);
  return { tickets, async handle(request) {
    const origin = request.headers.get("Origin");
    const headers = new Headers({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", Vary: "Origin" });
    if (origin && options.origins.includes(origin)) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Access-Control-Allow-Headers", `Authorization, Content-Type, ${REMOTE_CLIENT_HEADER}`);
      headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    }
    let response: Response;
    try {
      if (origin && !options.origins.includes(origin)) throw new RuntimeFailure("forbidden", "This origin is not allowed.");
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
      if (!incoming("all")) throw new RuntimeFailure("rate-limited", "Too many requests. Try again shortly.");
      const token = bearerToken(request.headers.get("Authorization"));
      if (!token) throw new RuntimeFailure("unauthenticated", "Sign in to access this runtime.");
      const identity = await options.verifier.verify(token).catch(() => { throw new RuntimeFailure("unauthenticated", "Sign in to access this runtime."); });
      if (options.presence.revoked(identity.sessionId)) throw new RuntimeFailure("forbidden", "This device was disconnected from the computer. Sign out of Nora on this device and sign in again to reconnect.");
      if (!options.permits(identity) || identity.expiresAt <= options.now()) throw new RuntimeFailure("forbidden", `${NORA_RELAY_NAME} is not available for this account.`);
      if (!allow(identity.sessionId)) throw new RuntimeFailure("rate-limited", "Too many requests. Try again shortly.");
      options.presence.seen(identity, describeRemoteClient(request.headers));
      const url = new URL(request.url);
      const route = matchRuntimeRoute(request.method, url.pathname);
      if (request.method === "GET") response = await readRuntimeRoute(options, route, url.searchParams);
      else {
        const body = await readJson(request, runtimeBodyLimit(request.method, url.pathname));
        request.signal.throwIfAborted();
        if (!options.permits(identity) || identity.expiresAt <= options.now()) throw new RuntimeFailure("forbidden", `${NORA_RELAY_NAME} is no longer available.`);
        response = route.kind === "ticket" ? Response.json(realtimeTicketResponseSchema.parse(tickets.issue(identity)))
          : route.kind === "attachment-upload" ? await uploadRemoteAttachment(options, body)
          : route.kind === "inbox-command" ? applyRemoteInboxCommand(options, body)
          : route.kind === "settings-update" || route.kind === "bot-save" ? await updateRemoteManagement(options, route.kind, body)
          : await executeRemoteCommand(options, route, body, identity);
      }
    } catch (error) {
      const failure = describeRuntimeFailure(error);
      response = Response.json({ error: { code: failure.code, message: failure.message } }, { status: failure.status });
    }
    headers.forEach((value, name) => response.headers.set(name, value));
    return response;
  } };
}
