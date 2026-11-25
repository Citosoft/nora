import { OAuthError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { ConnectorOAuthClient, tokensExpired } from "./oauthClient";
import { refreshConnectorTokens } from "./refreshTokens";
import type { ConnectorCredentials, ConnectorCredentialsOptions, ConnectorRefreshCooldown, StoredConnector } from "@main/types/connectors/connectors.types";

const REFRESH_FAILURE_DELAY_MS = 60_000;
const RATE_LIMIT_DELAY_MS = 15 * 60_000;
const PERMANENT_AUTH_ERRORS = new Set(["invalid_grant", "invalid_client", "unauthorized_client", "access_denied", "invalid_token",
  "invalid_scope", "insufficient_scope", "invalid_target", "invalid_request", "unsupported_grant_type"]);

function retryAfterMs(value: string | null, now: number): number | null {
  if (!value?.trim()) return null;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - now;
  return Number.isFinite(delay) && delay >= 0 ? delay : null;
}

/**
 * Request headers for a connector's upstream server. Header connectors send their configured header; OAuth connectors send their
 * access token, refreshed first when it has expired or the server rejected it. Refreshes are shared per connector because
 * servers that rotate refresh tokens invalidate the old one on first use. Null means the user must sign in again.
 */
export function createConnectorCredentials({ store, fetch: fetchFn, now = Date.now }: ConnectorCredentialsOptions): ConnectorCredentials {
  const refreshing = new Map<string, Promise<boolean>>();
  const cooldowns = new Map<string, ConnectorRefreshCooldown>();
  const requireSignIn = (connector: StoredConnector): void => {
    cooldowns.delete(connector.id);
    store.updateSecrets(connector.id, { tokens: undefined, requiresSignIn: true });
  };

  async function refresh(connector: StoredConnector): Promise<boolean> {
    const secrets = store.secrets(connector.id);
    if (!secrets.tokens?.tokens.refresh_token) { requireSignIn(connector); return false; }
    let retryAt = now() + REFRESH_FAILURE_DELAY_MS;
    // Background refresh reuses the registered redirect URI so the stored client still applies, and never opens a browser.
    const client = new ConnectorOAuthClient(store, connector, { redirectUrl: secrets.client?.redirectUri ?? "http://127.0.0.1/callback" }, now);
    try {
      await refreshConnectorTokens(client, connector.url, async (input, init) => {
        const response = await (fetchFn ?? fetch)(input, init);
        if (!response.ok) {
          const delay = retryAfterMs(response.headers.get("retry-after"), now());
          if (delay !== null || response.status === 429) retryAt = Math.max(retryAt, now() + (delay ?? RATE_LIMIT_DELAY_MS));
        }
        return response;
      });
      cooldowns.delete(connector.id);
      return true;
    } catch (error) {
      console.warn(`Connector ${connector.name} could not refresh its sign-in`, error);
      if (error instanceof OAuthError && PERMANENT_AUTH_ERRORS.has(error.errorCode)) { requireSignIn(connector); return false; }
    }
    cooldowns.set(connector.id, { accessToken: secrets.tokens.tokens.access_token, savedAt: secrets.tokens.savedAt, retryAt });
    return false;
  }
  const sharedRefresh = (connector: StoredConnector): Promise<boolean> => {
    const existing = refreshing.get(connector.id);
    if (existing) return existing;
    const pending = refresh(connector).finally(() => refreshing.delete(connector.id));
    refreshing.set(connector.id, pending);
    return pending;
  };

  const read = async (connector: StoredConnector, { forceRefresh }: Parameters<ConnectorCredentials>[1]): ReturnType<ConnectorCredentials> => {
    if (connector.auth.kind === "header") {
      const value = store.secrets(connector.id).headerValue;
      return value ? { [connector.auth.name]: value } : null;
    }
    const secrets = store.secrets(connector.id);
    if (secrets.requiresSignIn) return null;
    const saved = secrets.tokens;
    // Never signed in: try without credentials, since not every server requires them; a rejection means a sign-in is needed.
    if (!saved) { cooldowns.delete(connector.id); return forceRefresh ? null : {}; }
    // Keep a failed refresh from becoming one token request per probe or tool call. A new sign-in supersedes the failure.
    const cooldown = cooldowns.get(connector.id);
    if (cooldown) {
      if (cooldown.accessToken === saved.tokens.access_token && cooldown.savedAt === saved.savedAt && now() < cooldown.retryAt) return null;
      cooldowns.delete(connector.id);
    }
    if ((forceRefresh || tokensExpired(saved, now())) && !await sharedRefresh(connector)) return null;
    const current = store.secrets(connector.id).tokens;
    return current ? { Authorization: `Bearer ${current.tokens.access_token}` } : null;
  };
  return Object.assign(read, { requireSignIn });
}
