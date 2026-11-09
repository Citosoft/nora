import { StringDecoder } from "node:string_decoder";
import type { z } from "zod";
import type { JsonValue, RpcOptions, RpcPending } from "@main/types/execution/rpc.types";
import { rpcMessageSchema } from "./rpcSchemas";

/** Newline-delimited App Server RPC. Framing and correlation never escape this boundary. */
export class StdioRpc {
  private readonly pending = new Map<string | number, RpcPending>();
  private readonly decoder = new StringDecoder("utf8");
  private buffer = "";
  private sequence = 0;
  private closed = false;
  private readonly exited: Promise<void>;

  constructor(private readonly options: RpcOptions) {
    this.exited = new Promise((resolve) => { options.process.once("close", () => resolve()); });
    options.process.stdout.on("data", (chunk: Buffer) => this.consume(chunk));
    options.process.on("error", () => this.disconnect());
    options.process.on("exit", () => this.disconnect());
    options.process.stdin.on("error", () => this.disconnect());
    // Drain without forwarding provider diagnostics, which can include credentials.
    options.process.stderr.resume();
  }

  request<T>(method: string, params: JsonValue, schema: z.ZodType<T>): Promise<T> {
    const id = ++this.sequence;
    return new Promise<T>((resolve, reject) => {
      if (this.closed) { reject(new Error("Codex connection is closed")); return; }
      const timeout = setTimeout(() => this.disconnect(), this.options.timeoutMs ?? 30_000);
      this.pending.set(id, { timeout, reject, resolve: (value) => {
        const parsed = schema.safeParse(value);
        if (parsed.success) resolve(parsed.data);
        else reject(new Error("Codex returned an incompatible protocol response"));
      } });
      this.write({ id, method, params });
    });
  }

  notify(method: string, params: JsonValue): void { this.write({ method, params }); }

  private write(message: JsonValue): void {
    if (this.closed) throw new Error("Codex connection is closed");
    this.options.process.stdin.write(`${JSON.stringify(message)}\n`, (error) => { if (error) this.disconnect(); });
  }

  private consume(chunk: Buffer): void {
    if (this.closed) return;
    this.buffer += this.decoder.write(chunk);
    if (Buffer.byteLength(this.buffer) > 16 * 1024 * 1024) { this.disconnect(); return; }
    let end = this.buffer.indexOf("\n");
    while (end !== -1 && !this.closed) {
      const line = this.buffer.slice(0, end).trim();
      this.buffer = this.buffer.slice(end + 1);
      if (line) {
        try { this.receive(JSON.parse(line)); } catch { this.disconnect(); }
      }
      end = this.buffer.indexOf("\n");
    }
  }

  private receive(input: unknown): void {
    const message = rpcMessageSchema.parse(input);
    if (message.method) {
      if (message.id !== undefined) {
        const id = message.id;
        void this.options.onRequest(id, message.method, message.params ?? null).then(
          (result) => { if (!this.closed) this.write({ id, result }); },
          () => { if (!this.closed) this.write({ id, error: { code: -32601, message: "Request is unsupported or expired" } }); }
        ).catch(() => this.disconnect());
      } else this.options.onNotification(message.method, message.params ?? null);
      return;
    }
    if (message.id === undefined) throw new Error("Uncorrelated Codex response");
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    clearTimeout(pending.timeout);
    if (message.error) pending.reject(new Error(`Codex RPC failed (${message.error.code})`));
    else if (message.result !== undefined) pending.resolve(message.result);
    else pending.reject(new Error("Codex response has no result"));
  }

  private disconnect(): void {
    if (this.closed) return;
    this.closed = true;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Codex connection lost; execution outcome is unconfirmed"));
    }
    this.pending.clear();
    this.options.process.kill();
    this.options.onDisconnect();
  }
  close(): Promise<void> { this.disconnect(); return this.exited; }
}
