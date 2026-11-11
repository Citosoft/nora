import { spawn } from "node:child_process";
import { Readable, Writable } from "node:stream";
import { client, methods, ndJsonStream, PROTOCOL_VERSION } from "@agentclientprotocol/sdk";
import type { AcpConnectionHandlers, AcpLiveConnection, AcpOptions } from "@main/types/execution/acp.types";
import { APP_VERSION } from "@shared/appMeta";

const DEFAULT_SETUP_TIMEOUT_MS = 30_000;

export function withAcpTimeout<T>(work: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([work, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); timer.unref(); })])
    .finally(() => clearTimeout(timer));
}

/**
 * Starts the agent's ACP server over stdio and completes `initialize`. Nora advertises no filesystem or terminal
 * client capabilities, so agents use their own tools and Nora only renders updates and answers permission requests.
 */
export async function openAcpConnection(options: AcpOptions, handlers: AcpConnectionHandlers): Promise<AcpLiveConnection> {
  const child = spawn(options.executable, [...options.args], { env: { ...process.env, ...options.environment }, stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true, shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(options.executable) });
  // Agents log to stderr; drain it so a chatty agent can never block on a full pipe.
  child.stderr.resume();
  const spawned = new Promise<void>((resolve, reject) => { child.once("spawn", resolve); child.once("error", reject); });
  // Node types web streams with an untyped chunk; the ACP transport reads and writes bytes.
  const stream = ndJsonStream(Writable.toWeb(child.stdin) as WritableStream<Uint8Array>, Readable.toWeb(child.stdout) as ReadableStream<Uint8Array>);
  const connection = client({ name: "nora" })
    .onNotification(methods.client.session.update, ({ params }) => handlers.onUpdate(params))
    .onRequest(methods.client.session.requestPermission, ({ params, signal }) => handlers.onPermission(params, signal))
    .connect(stream);
  let exited = false;
  const close = (): void => {
    if (exited) return;
    exited = true;
    connection.close();
    if (child.exitCode === null && child.signalCode === null) child.kill();
    handlers.onExit();
  };
  child.once("exit", close);
  child.once("error", close);
  void connection.closed.then(close, close);
  try {
    await spawned;
    const init = await withAcpTimeout(connection.agent.request(methods.agent.initialize, { protocolVersion: PROTOCOL_VERSION,
      clientCapabilities: {}, clientInfo: { name: "nora", title: "Nora", version: APP_VERSION } }),
    options.setupTimeoutMs ?? DEFAULT_SETUP_TIMEOUT_MS, `${options.label} did not finish starting its ACP server`);
    if (init.protocolVersion !== PROTOCOL_VERSION) throw new Error(`${options.label} speaks an unsupported ACP version`);
    return { agent: connection.agent, init, closed: connection.closed.catch(() => {}), close };
  } catch (error) {
    close();
    throw error;
  }
}
