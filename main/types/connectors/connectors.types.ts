import type { OAuthClientInformationMixed, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";
import type { OAuthDiscoveryState } from "@modelcontextprotocol/sdk/client/auth.js";
import type { Dispatcher } from "undici";
import type { Connector, ConnectorAccess, ConnectorInput, ConnectorSubject } from "@shared/types/connectors/connectors.types";
import type { McpServerLogo } from "@shared/types/provider/mcp.types";
import type { SecretCodec } from "@main/types/secretEncryption.types";
import type { RunContextConnectors, RunMcpServer } from "@main/types/nora-tools/noraTools.types";
import type { McpTool } from "@shared/types/provider/mcp.types";
import type { JsonValue } from "@main/jsonValue";

/** Non-secret authentication settings kept in the clear. */
export type StoredConnectorAuth = { kind: "oauth"; clientId?: string } | { kind: "header"; name: string };
export interface StoredConnector {
  id: string;
  name: string;
  serverName: string;
  url: string;
  enabled: boolean;
  auth: StoredConnectorAuth;
  access: ConnectorAccess;
}
/** A dynamically registered OAuth client and the redirect URI it was registered with; a different callback port needs a new one. */
export interface ConnectorOAuthClient { information: OAuthClientInformationMixed; redirectUri: string; }
/** Tokens with when they were saved, so expiry can be checked before a request rather than after it fails. */
export interface ConnectorOAuthTokens { tokens: OAuthTokens; savedAt: number; }
/** Everything secret about a connector, encrypted at rest as one value. */
export interface ConnectorSecrets {
  requiresSignIn?: boolean;
  headerValue?: string;
  clientSecret?: string;
  client?: ConnectorOAuthClient;
  tokens?: ConnectorOAuthTokens;
  discovery?: OAuthDiscoveryState;
}
export interface ConnectorStore {
  list(): StoredConnector[];
  get(id: string): StoredConnector | undefined;
  add(connector: StoredConnector, secrets: ConnectorSecrets): void;
  update(id: string, patch: Partial<Pick<StoredConnector, "enabled" | "access">>): void;
  remove(id: string): void;
  secrets(id: string): ConnectorSecrets;
  /** Merges into the stored secrets; a key set to `undefined` is removed. */
  updateSecrets(id: string, patch: Partial<ConnectorSecrets>): void;
}
export interface ConnectorStoreOptions { path: string; codec: SecretCodec; }

/** What Nora learned the last time it connected to a connector. */
export interface ConnectorProbe {
  status: Exclude<Connector["status"], "disabled" | "checking">;
  tools: Connector["tools"];
  logo?: McpServerLogo;
  message?: string;
}
export type ConnectorRuntimeState = Pick<Connector, "status" | "tools" | "logo" | "message">;

/** How the OAuth client behind a connector reaches the user: interactive sign-in opens the browser; background refresh never does. */
export interface ConnectorOAuthSession {
  redirectUrl: string;
  /** Present for an interactive sign-in; background refresh leaves it out, so a needed sign-in is reported instead of started. */
  openAuthorization?: (url: URL) => Promise<void>;
  state?: string;
}
export interface OAuthCallbackServer {
  redirectUrl: string;
  /** Resolves with the authorization code once the browser returns with the expected state. */
  waitForCode(state: string, signal: AbortSignal): Promise<string>;
  close(): Promise<void>;
}

/** Fresh request headers for a connector's upstream server, or null when it needs the user to sign in again. */
export interface ConnectorCredentials {
  (connector: StoredConnector, options: { forceRefresh: boolean }): Promise<Record<string, string> | null>;
  requireSignIn(connector: StoredConnector): void;
}
export interface ConnectorCredentialsOptions { store: ConnectorStore; fetch?: typeof fetch; now?: () => number; }
export interface ConnectorRefreshCooldown { accessToken: string; savedAt: number; retryAt: number; }

export interface ConnectorGateway {
  /**
   * How a thread's runtime reaches a connector: Nora's gateway, which adds the real credentials. Starts the gateway on first use.
   * `conversationIds` scopes authorize prompts to the waiting thread (and its parents).
   */
  endpoint(connector: StoredConnector, conversationIds?: readonly string[]): Promise<RunMcpServer>;
  close(): Promise<void>;
}
export interface ConnectorGatewayOptions {
  store: ConnectorStore;
  credentials: ConnectorCredentials;
  onNeedsAuth(id: string): void;
  /** When set, OAuth needs-auth holds the HTTP call and opens a thread authorize card instead of failing immediately. */
  authPrompts?: import("@main/types/connectors/authPrompt.types").ConnectorAuthPromptBroker;
  /** Logo shown on the authorize card when the connector was probed earlier. */
  logoFor?(id: string): import("@shared/types/provider/mcp.types").McpServerLogo | undefined;
  /** Tools Nora last saw on the connector, listed to a runtime that connects while it is signed out. */
  toolsFor?(id: string): readonly McpTool[];
  fetch?: typeof fetch;
}

/** What a connector tool returned, as the MCP SDK shapes it; `structuredContent` is preferred when the tool declares an output schema. */
export interface ConnectorToolCallResult { content: readonly { type: string; text?: string }[]; structuredContent?: Record<string, unknown>; isError?: boolean; }
/** Calls connector tools from main itself (for apps), with the same credentials and refresh as the gateway. */
export interface ConnectorToolClient {
  callTool(connectorId: string, tool: string, args: Record<string, JsonValue>): Promise<ConnectorToolCallResult>;
  listTools(connectorId: string): Promise<McpTool[]>;
  /** Drops the connector's session so the next call reconnects with current credentials. */
  forget(connectorId: string): Promise<void>;
  close(): Promise<void>;
}
export interface ConnectorToolClientOptions {
  store: ConnectorStore;
  credentials: ConnectorCredentials;
  onNeedsAuth(id: string): void;
  fetch?: typeof fetch;
}

export interface ConnectorServiceOptions {
  /** Resolves current bot settings per request, so saved changes also affect existing threads. */
  connectorIdsForBot?(subject: ConnectorSubject): readonly string[] | undefined;
  store: ConnectorStore;
  openExternal(url: string): Promise<void>;
  onChanged(connectors: Connector[]): void;
  nextId(): string;
  /** Port the OAuth callback tries first, so dynamically registered clients usually keep a valid redirect URI. */
  callbackPort?: number;
  fetch?: typeof fetch;
  /** Thread authorize prompts for OAuth connectors that are not signed in when a tool call needs them. */
  authPrompts?: import("@main/types/connectors/authPrompt.types").ConnectorAuthPromptBroker;
}
export interface ConnectorNetworkRequestInit extends RequestInit { dispatcher: Dispatcher; }
export interface ConnectorNetwork { fetch: typeof fetch; close(): Promise<void>; }
export interface ConnectorService extends RunContextConnectors {
  list(): Connector[];
  create(input: ConnectorInput): Promise<Connector[]>;
  setEnabled(id: string, enabled: boolean): Promise<Connector[]>;
  setAccess(id: string, access: ConnectorAccess): Promise<Connector[]>;
  remove(id: string): Promise<Connector[]>;
  signIn(id: string): Promise<Connector[]>;
  signOut(id: string): Promise<Connector[]>;
  refresh(id?: string): Promise<Connector[]>;
  /** Nora's own calls to connector tools, for apps; honours each connector's access rules through `subject`. */
  tools: ConnectorToolAccess;
  close(): Promise<void>;
}
/** Tool calls on behalf of a subject (an app is a Nora-owned subject in its workspace), refused for connectors it cannot reach. */
export interface ConnectorToolAccess {
  call(connectorId: string, tool: string, args: Record<string, JsonValue>, subject: ConnectorSubject): Promise<ConnectorToolCallResult>;
  /** Connectors the subject can use, with their tools and input schemas as last probed. */
  available(subject: ConnectorSubject): Connector[];
}
