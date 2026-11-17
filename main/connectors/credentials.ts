import { auth } from "@modelcontextprotocol/sdk/client/auth.js";
import { ConnectorOAuthClient, tokensExpired } from "./oauthClient";
import type { ConnectorCredentials, ConnectorCredentialsOptions, StoredConnector } from "@main/types/connectors/connectors.types";

/**
 * Request headers for a connector's upstream server. Header connectors send their configured header; OAuth connectors send their
 * access token, refreshed first when it has expired or the server rejected it. Refreshes are shared per connector because
 * servers that rotate refresh tokens invalidate the old one on first use. Null means the user must sign in again.
 */
export function createConnectorCredentials({ store, fetch: fetchFn, now = Date.now }: ConnectorCredentialsOptions): ConnectorCredentials {
  const refreshing = new Map<string, Promise<boolean>>();

  async function refresh(connector: StoredConnector): Promise<boolean> {
    const secrets = store.secrets(connector.id);
    if (!secrets.tokens?.tokens.refresh_token) return false;
    // Background refresh reuses the registered redirect URI so the stored client still applies, and never opens a browser.
    const client = new ConnectorOAuthClient(store, connector, { redirectUrl: secrets.client?.redirectUri ?? "http://127.0.0.1/callback" }, now);
    try {
      const result = await auth(client, { serverUrl: connector.url, ...(fetchFn ? { fetchFn } : {}) });
      return result === "AUTHORIZED" && !client.signInRequired;
    } catch (error) {
      console.warn(`Connector ${connector.name} could not refresh its sign-in`, error);
      return false;
    }
  }
  const sharedRefresh = (connector: StoredConnector): Promise<boolean> => {
    const existing = refreshing.get(connector.id);
    if (existing) return existing;
    const pending = refresh(connector).finally(() => refreshing.delete(connector.id));
    refreshing.set(connector.id, pending);
    return pending;
  };

  return async (connector, { forceRefresh }) => {
    if (connector.auth.kind === "header") {
      const value = store.secrets(connector.id).headerValue;
      return value ? { [connector.auth.name]: value } : null;
    }
    const saved = store.secrets(connector.id).tokens;
    // Never signed in: try without credentials, since not every server requires them; a rejection means a sign-in is needed.
    if (!saved) return forceRefresh ? null : {};
    if ((forceRefresh || tokensExpired(saved, now())) && !await sharedRefresh(connector)) return null;
    const current = store.secrets(connector.id).tokens;
    return current ? { Authorization: `Bearer ${current.tokens.access_token}` } : null;
  };
}
