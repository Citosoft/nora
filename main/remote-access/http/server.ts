import { createServer } from "node:http";
import type { IncomingMessage } from "node:http";
import type { Socket } from "node:net";
import { WebSocketServer, WebSocket } from "ws";
import { REALTIME_CLOSE_CODES, REMOTE_LIMITS } from "@shared/remote-access/constants";
import type { RuntimeServer, RuntimeServerOptions } from "@main/types/remote-access/http/runtime.types";
import { createRuntimeApi } from "./handler";
import { attachRuntimeRealtime } from "./realtime";
import { RuntimeFailure, describeRuntimeFailure } from "./failure";

async function incomingBody(request: IncomingMessage): Promise<ArrayBuffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const input of request.iterator({ destroyOnReturn: false })) {
    // Node streams are untyped at this boundary; accept only their documented byte/string chunks.
    const chunk: unknown = input;
    if (!Buffer.isBuffer(chunk) && typeof chunk !== "string") throw new RuntimeFailure("invalid", "Invalid request body.");
    const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    size += buffer.byteLength;
    if (size > REMOTE_LIMITS.maxBodyBytes) throw new RuntimeFailure("too-large", "This request is too large.");
    chunks.push(buffer);
  }
  return Uint8Array.from(Buffer.concat(chunks)).buffer;
}

/** Only loopback is bound. Host and Origin checks also protect the listener from DNS rebinding. */
export async function startRuntimeServer(options: RuntimeServerOptions): Promise<RuntimeServer> {
  const api = createRuntimeApi(options);
  const sockets = new Set<Socket>();
  let closing = false;
  let port = options.port ?? 0;
  const allowedHost = (host: string | undefined): boolean => host === `127.0.0.1:${port}` || (!!options.hostname() && host === options.hostname());
  const server = createServer({ maxHeaderSize: 16_384, requestTimeout: 15_000, headersTimeout: 10_000 }, (incoming, outgoing) => {
    void (async () => {
      try {
        if (closing || !allowedHost(incoming.headers.host)) throw new RuntimeFailure("forbidden", "This host is not allowed.");
        const method = incoming.method ?? "GET";
        const body = method === "GET" || method === "OPTIONS" ? undefined : await incomingBody(incoming);
        const headers = new Headers();
        for (const [key, value] of Object.entries(incoming.headers)) {
          if (Array.isArray(value)) for (const item of value) headers.append(key, item);
          else if (value !== undefined) headers.set(key, value);
        }
        const abort = new AbortController();
        outgoing.on("close", () => { if (!outgoing.writableEnded) abort.abort(); });
        const request = new Request(new URL(incoming.url ?? "/", `http://127.0.0.1:${port}`), { method, headers,
          ...(body ? { body } : {}), signal: abort.signal });
        const response = await api.handle(request);
        if (closing || outgoing.destroyed) return;
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, name) => { responseHeaders[name] = value; });
        outgoing.writeHead(response.status, responseHeaders);
        outgoing.end(Buffer.from(await response.arrayBuffer()));
      } catch (error) {
        if (outgoing.destroyed) return;
        const failure = describeRuntimeFailure(error);
        outgoing.writeHead(failure.status, { "Content-Type": "application/json", "Cache-Control": "no-store", Connection: "close" });
        outgoing.end(JSON.stringify({ error: { code: failure.code, message: failure.message } }));
      }
    })();
  });
  server.maxConnections = 128;
  server.maxRequestsPerSocket = 100;
  server.on("connection", (socket) => { sockets.add(socket); socket.once("close", () => sockets.delete(socket)); });
  const websocket = new WebSocketServer({ noServer: true, maxPayload: 8192, perMessageDeflate: false });
  server.on("upgrade", (request, socket, head) => {
    try {
      const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
      const origin = request.headers.origin;
      if (closing || !allowedHost(request.headers.host) || !origin || !options.origins.includes(origin)
        || url.pathname !== "/v1/realtime" || [...url.searchParams.keys()].some((key) => key !== "ticket")) throw new Error("Rejected handshake");
      const ticket = url.searchParams.get("ticket") ?? "";
      if (ticket.length > 128 || websocket.clients.size >= REMOTE_LIMITS.maxRealtimeSockets) throw new Error("Rejected handshake");
      const identity = api.tickets.consume(ticket);
      if (!identity || !options.permits(identity)) throw new Error("Rejected handshake");
      websocket.handleUpgrade(request, socket, head, (client) => {
        client.on("error", () => client.terminate());
        attachRuntimeRealtime(options, api.tickets, {
          send(message) {
            if (client.readyState !== WebSocket.OPEN || client.bufferedAmount > 1024 * 1024) return false;
            client.send(JSON.stringify(message)); return true;
          },
          close(code) { client.close(code); const force = setTimeout(() => client.terminate(), 1000); force.unref(); },
          onMessage(listener) { client.on("message", (data, binary) => { if (binary) client.close(REALTIME_CLOSE_CODES.forbidden); else listener(data.toString()); }); },
          onClose(listener) { client.once("close", listener); }
        }, identity);
      });
    } catch { socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n"); }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => { server.removeListener("error", reject); resolve(); });
  }).catch((error: unknown) => { websocket.close(); throw error; });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Remote access could not open its loopback listener.");
  port = address.port;
  server.on("error", () => { void close(); });
  async function close(): Promise<void> {
    if (closing) return;
    closing = true; api.tickets.clear();
    for (const client of websocket.clients) { client.close(REALTIME_CLOSE_CODES.unavailable); client.terminate(); }
    websocket.close();
    const done = new Promise<void>((resolve) => server.close(() => resolve()));
    for (const socket of sockets) socket.destroy();
    await done;
  }
  return { port, close };
}
