import type { OAuthClientInformationMixed, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";
import type { Connector, ConnectorAccess, ConnectorInput } from "@shared/types/connectors/connectors.types";
import type { McpServerLogo } from "@shared/types/provider/mcp.types";
import type { SecretCodec } from "@main/types/secretEncryption.types";
import type { RunContextConnectors, RunMcpServer } from "@main/types/nora-tools/noraTools.types";

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
  headerValue?: string;
  clientSecret?: string;
  client?: ConnectorOAuthClient;
  tokens?: ConnectorOAuthTokens;
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
export type ConnectorCredentials = (connector: StoredConnector, options: { forceRefresh: boolean }) => Promise<Record<string, string> | null>;
export interface ConnectorCredentialsOptions { store: ConnectorStore; fetch?: typeof fetch; now?: () => number; }

export interface ConnectorGateway {
  /** How a thread's runtime reaches a connector: Nora's gateway, which adds the real credentials. Starts the gateway on first use. */
  endpoint(connector: StoredConnector): Promise<RunMcpServer>;
  close(): Promise<void>;
}
export interface ConnectorGatewayOptions {
  store: ConnectorStore;
  credentials: ConnectorCredentials;
  onNeedsAuth(id: string): void;
  fetch?: typeof fetch;
}

export interface ConnectorServiceOptions {
  store: ConnectorStore;
  openExternal(url: string): Promise<void>;
  onChanged(connectors: Connector[]): void;
  nextId(): string;
  /** Port the OAuth callback tries first, so dynamically registered clients usually keep a valid redirect URI. */
  callbackPort?: number;
  fetch?: typeof fetch;
}
export interface ConnectorService extends RunContextConnectors {
  list(): Connector[];
  create(input: ConnectorInput): Promise<Connector[]>;
  setEnabled(id: string, enabled: boolean): Promise<Connector[]>;
  setAccess(id: string, access: ConnectorAccess): Promise<Connector[]>;
  remove(id: string): Promise<Connector[]>;
  signIn(id: string): Promise<Connector[]>;
  signOut(id: string): Promise<Connector[]>;
  refresh(id?: string): Promise<Connector[]>;
  close(): Promise<void>;
}
