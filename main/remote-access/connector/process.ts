import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import type { ConnectorHandle, ConnectorOptions, RemoteConnector } from "@main/types/remote-access/connector/connector.types";
import { installConnector } from "./install";

async function freeLoopbackPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  if (!address || typeof address === "string") throw new Error("The connector health listener could not be opened.");
  return address.port;
}

async function stopChild(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null || !child.pid) return;
  const done = new Promise<void>((resolve) => child.once("exit", () => resolve()));
  child.kill("SIGTERM");
  const force = setTimeout(() => child.kill("SIGKILL"), 4000); force.unref();
  try { await done; } finally { clearTimeout(force); }
}

/** cloudflared handles network reconnects; exited processes restart with capped exponential backoff. */
export function createRemoteConnector(options: ConnectorOptions): RemoteConnector {
  return { async start(input): Promise<ConnectorHandle> {
    const executable = await installConnector(options, input.signal, (progress) => input.onStatus({ status: "downloading", progress }));
    input.signal.throwIfAborted();
    const cancel = new AbortController();
    const signal = AbortSignal.any([cancel.signal, input.signal]);
    let child: ChildProcess | null = null;
    const environment: NodeJS.ProcessEnv = { PATH: options.env.PATH, SystemRoot: options.env.SystemRoot,
      WINDIR: options.env.WINDIR, HOME: options.env.HOME, TMPDIR: options.env.TMPDIR, TEMP: options.env.TEMP, TMP: options.env.TMP,
      // Keep the credential out of process arguments and application logs. It lives only in this child environment.
      TUNNEL_TOKEN: input.token };
    const run = async (): Promise<void> => {
      let attempts = 0;
      while (!signal.aborted) {
        input.onStatus(attempts ? { status: "reconnecting", message: "Reconnecting to the remote network…" } : { status: "starting" });
        const port = await freeLoopbackPort();
        signal.throwIfAborted();
        const process = spawn(executable, ["tunnel", "--no-autoupdate", "--metrics", `127.0.0.1:${port}`, "--grace-period", "2s", "run"],
          { env: environment, stdio: "ignore", windowsHide: true, shell: false });
        child = process;
        let exited = false;
        let spawnFailed = false;
        process.once("exit", () => { exited = true; });
        process.once("error", () => { spawnFailed = true; exited = true; });
        const abort = () => { void stopChild(process); };
        signal.addEventListener("abort", abort, { once: true });
        let connected = false;
        try {
          while (!signal.aborted && !exited) {
            const healthy = await options.fetch(`http://127.0.0.1:${port}/ready`, { signal: AbortSignal.any([signal, AbortSignal.timeout(1500)]) })
              .then((response) => response.ok).catch(() => false);
            if (signal.aborted) break;
            if (healthy !== connected) {
              connected = healthy;
              input.onStatus(healthy ? { status: "connected" } : { status: "reconnecting", message: "Waiting for the network connection…" });
            }
            if (healthy) attempts = 0;
            await delay(2000, undefined, { signal });
          }
        } finally {
          signal.removeEventListener("abort", abort);
          await stopChild(process); child = null;
        }
        if (signal.aborted) break;
        if (spawnFailed) throw new Error("The remote connector could not start on this computer.");
        input.onStatus({ status: "reconnecting", message: "The remote connector stopped. Reconnecting…" });
        await delay(Math.min(60_000, 1000 * 2 ** Math.min(attempts++, 6)), undefined, { signal });
      }
    };
    const job = run().catch(() => {
      if (!signal.aborted) input.onStatus({ status: "error", message: "The remote connector stopped. Retry to reconnect.", retryable: true });
    });
    return { async stop() { cancel.abort(); if (child) await stopChild(child); await job; } };
  } };
}
