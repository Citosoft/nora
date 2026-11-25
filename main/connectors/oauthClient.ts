import { randomBytes } from "node:crypto";
import type { OAuthClientProvider, OAuthDiscoveryState } from "@modelcontextprotocol/sdk/client/auth.js";
import type { OAuthClientInformationMixed, OAuthClientMetadata, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";
import type { ConnectorOAuthSession, ConnectorStore, StoredConnector } from "@main/types/connectors/connectors.types";

/** A token this close to expiry is refreshed before use rather than sent and rejected. */
const EXPIRY_MARGIN_MS = 60_000;

/** Whether saved tokens are known to have expired; tokens without a lifetime are used until the server rejects them. */
export function tokensExpired(saved: { tokens: OAuthTokens; savedAt: number }, now: number): boolean {
  const lifetime = saved.tokens.expires_in;
  return lifetime !== undefined && saved.savedAt + lifetime * 1000 - EXPIRY_MARGIN_MS <= now;
}

/**
 * The MCP SDK's OAuth client for one connector, backed by the connector store. Discovery, dynamic client registration, PKCE and
 * refresh are the SDK's; this decides where state lives. A dynamically registered client is tied to the redirect URI it was
 * registered with, so a sign-in on a different callback port registers again. Without `openAuthorization` (background refresh)
 * a needed sign-in is only recorded in `signInRequired`, never started.
 */
export class ConnectorOAuthClient implements OAuthClientProvider {
  private verifier: string | null = null;
  private readonly stateValue: string;
  signInRequired = false;

  constructor(private readonly store: ConnectorStore, private readonly connector: StoredConnector,
    private readonly session: ConnectorOAuthSession, private readonly now: () => number = Date.now) {
    this.stateValue = session.state ?? randomBytes(16).toString("base64url");
  }

  get redirectUrl(): string { return this.session.redirectUrl; }

  get clientMetadata(): OAuthClientMetadata {
    return { client_name: "Nora", client_uri: "https://www.withnora.run", redirect_uris: [this.session.redirectUrl],
      grant_types: ["authorization_code", "refresh_token"], response_types: ["code"],
      token_endpoint_auth_method: this.customClient()?.clientSecret ? "client_secret_post" : "none" };
  }

  state(): string { return this.stateValue; }

  clientInformation(): OAuthClientInformationMixed | undefined {
    const custom = this.customClient();
    if (custom) return { client_id: custom.clientId, ...(custom.clientSecret ? { client_secret: custom.clientSecret } : {}) };
    const client = this.store.secrets(this.connector.id).client;
    return client && client.redirectUri === this.session.redirectUrl ? client.information : undefined;
  }

  saveClientInformation(information: OAuthClientInformationMixed): void {
    // A pre-registered client is configured by the user, not learned from the server.
    if (this.customClient()) return;
    this.store.updateSecrets(this.connector.id, { client: { information, redirectUri: this.session.redirectUrl } });
  }

  tokens(): OAuthTokens | undefined { return this.store.secrets(this.connector.id).tokens?.tokens; }

  saveTokens(tokens: OAuthTokens): void { this.store.updateSecrets(this.connector.id, { tokens: { tokens, savedAt: this.now() }, requiresSignIn: undefined }); }

  discoveryState(): OAuthDiscoveryState | undefined { return this.store.secrets(this.connector.id).discovery; }

  saveDiscoveryState(discovery: OAuthDiscoveryState): void { this.store.updateSecrets(this.connector.id, { discovery }); }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    this.signInRequired = true;
    await this.session.openAuthorization?.(authorizationUrl);
  }

  saveCodeVerifier(codeVerifier: string): void { this.verifier = codeVerifier; }

  codeVerifier(): string {
    if (!this.verifier) throw new Error("The sign-in was not started from this window.");
    return this.verifier;
  }

  invalidateCredentials(scope: "all" | "client" | "tokens" | "verifier" | "discovery"): void {
    if (scope === "verifier") { this.verifier = null; return; }
    this.store.updateSecrets(this.connector.id, {
      ...(scope === "all" || scope === "discovery" ? { discovery: undefined } : {}),
      ...(scope === "all" || scope === "tokens" ? { tokens: undefined } : {}),
      ...(scope === "all" || scope === "client" ? { client: undefined } : {})
    });
  }

  private customClient(): { clientId: string; clientSecret?: string } | null {
    if (this.connector.auth.kind !== "oauth" || !this.connector.auth.clientId) return null;
    const clientSecret = this.store.secrets(this.connector.id).clientSecret;
    return { clientId: this.connector.auth.clientId, ...(clientSecret ? { clientSecret } : {}) };
  }
}
