import type { IncomingMessage } from "node:http";
import type { JsonObject } from "@main/jsonValue";
import type { StoredConnector } from "@main/types/connectors/connectors.types";

/** One JSON-RPC request or notification a runtime sent through the gateway; notifications have no `id`. */
export interface GatewayRpcMessage {
  method: string;
  id?: string | number;
  params?: JsonObject;
}
/** A runtime's POST body, keeping whether it arrived as a batch so a local answer has the same shape. */
export interface GatewayRpcRequest { batch: boolean; messages: GatewayRpcMessage[]; }

export type GatewayRpcReply = { jsonrpc: "2.0"; id: string | number } & ({ result: JsonObject } | { error: { code: number; message: string } });
/** An answer the gateway gives itself instead of forwarding upstream. */
export interface GatewayLocalReply { status: number; body?: GatewayRpcReply | GatewayRpcReply[]; }

/** Upstream MCP sessions Nora opens for runtimes that finished their handshake while the connector was signed out. */
export interface GatewaySessionBridge {
  /** The session header to add for `key`, opening an upstream session on first use; empty for servers without sessions. */
  headersFor(key: string, connector: StoredConnector, auth: Record<string, string>, protocolVersion: string, signal: AbortSignal): Promise<Record<string, string>>;
  forget(key: string): void;
  clear(): void;
}

/** A runtime request the gateway forwards, with what it needs to give a signed-out runtime an upstream session. */
export interface GatewayCall {
  request: IncomingMessage;
  body: Buffer | undefined;
  /** `{conversationId}/{connectorId}`: the runtime connection a bridged session belongs to. */
  key: string;
  protocolVersion: string;
  bridged: boolean;
}
