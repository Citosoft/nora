import { request as httpRequest } from "node:http";
import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import { WebSocket } from "ws";
import { startRuntimeServer } from "@main/remote-access/http/server";
import { realtimeTicketResponseSchema, realtimeServerMessageSchema } from "@shared/remote-access/runtimeApi";
import { runtimeFixture } from "./runtimeFixture";

const origin = "https://app.withnora.run";
const headers = { Authorization: "Bearer owner.token.signature", Origin: origin };

test("loopback HTTP and WebSocket transport validate Host, Origin and single-use tickets", { timeout: 5000 }, async (t) => {
  const f = runtimeFixture(t);
  const server = await startRuntimeServer({ ...f.options, port: null, hostname: () => "device.remote.withnora.run" });
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.port}`;
  assert.equal((await fetch(`${base}/v1/projects`, { headers })).status, 200);
  const wrongHost = await new Promise<number>((resolve, reject) => {
    const call = httpRequest(`${base}/v1/projects`, { headers: { ...headers, Host: "evil.example" } }, (response) => {
      response.resume(); resolve(response.statusCode ?? 0);
    });
    call.once("error", reject); call.end();
  });
  assert.equal(wrongHost, 403);
  assert.equal((await fetch(`${base}/v1/projects`)).status, 401);
  const ticketResponse = await fetch(`${base}/v1/realtime/ticket`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: "{}" });
  const ticket = realtimeTicketResponseSchema.parse(await ticketResponse.json()).ticket;
  const url = `ws://127.0.0.1:${server.port}/v1/realtime?ticket=${encodeURIComponent(ticket)}`;
  const client = new WebSocket(url, { origin });
  client.on("error", () => {});
  t.after(() => client.terminate());
  const ready = new Promise<string>((resolve) => client.once("message", (data) => resolve(data.toString())));
  await once(client, "open");
  const input: unknown = JSON.parse(await ready);
  assert.equal(realtimeServerMessageSchema.parse(input).type, "ready");
  const replay = new WebSocket(url, { origin });
  replay.on("error", () => {});
  t.after(() => replay.terminate());
  const rejected = await new Promise<number>((resolve) => replay.once("unexpected-response", (_request, response) => { response.resume(); resolve(response.statusCode ?? 0); }));
  assert.equal(rejected, 403);
  replay.terminate();
  const closed = once(client, "close");
  await server.close();
  await closed;
});

test("WebSocket accepts the runtime's own origin from native clients and rejects foreign origins", { timeout: 5000 }, async (t) => {
  const f = runtimeFixture(t);
  const hostname = "device.remote.withnora.run";
  const server = await startRuntimeServer({ ...f.options, port: null, hostname: () => hostname });
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.port}`;
  const socketUrl = async (): Promise<string> => {
    const response = await fetch(`${base}/v1/realtime/ticket`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: "{}" });
    const ticket = realtimeTicketResponseSchema.parse(await response.json()).ticket;
    return `ws://127.0.0.1:${server.port}/v1/realtime?ticket=${encodeURIComponent(ticket)}`;
  };

  const native = new WebSocket(await socketUrl(), { origin: `https://${hostname}` });
  native.on("error", () => {});
  t.after(() => native.terminate());
  await once(native, "open");

  const foreign = new WebSocket(await socketUrl(), { origin: "https://evil.example" });
  foreign.on("error", () => {});
  t.after(() => foreign.terminate());
  const status = await new Promise<number>((resolve) => foreign.once("unexpected-response", (_request, response) => { response.resume(); resolve(response.statusCode ?? 0); }));
  assert.equal(status, 403);
});
