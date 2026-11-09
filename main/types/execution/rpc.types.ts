import type { ChildProcessWithoutNullStreams } from "node:child_process";
import type { JsonValue } from "./json.types";

export type { JsonValue } from "./json.types";
export interface RpcPending {
  resolve: (value: JsonValue) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}
export interface RpcOptions {
  process: ChildProcessWithoutNullStreams;
  timeoutMs?: number;
  onNotification: (method: string, params: JsonValue) => void;
  onRequest: (id: string | number, method: string, params: JsonValue) => Promise<JsonValue>;
  onDisconnect: () => void;
}
