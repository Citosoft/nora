import { discoverOAuthServerInfo, refreshAuthorization, selectResourceURL } from "@modelcontextprotocol/sdk/client/auth.js";
import { InvalidClientError, InvalidGrantError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import type { ConnectorOAuthClient } from "./oauthClient";

const issuerKey = (url: string): string => new URL(url).href.replace(/\/$/, "");

/** Refresh only: the SDK's interactive auth entrypoint can fall back to registration and authorization after a failed refresh. */
export async function refreshConnectorTokens(client: ConnectorOAuthClient, url: string, fetchFn: typeof fetch): Promise<void> {
  const tokens = client.tokens();
  if (!tokens?.refresh_token) throw new InvalidGrantError("This connector has no refresh token. Sign in again.");
  const information = client.clientInformation();
  if (!information) throw new InvalidClientError("This connector has no registered OAuth client. Sign in again.");
  const cached = client.discoveryState();
  const discovery = cached?.authorizationServerMetadata ? cached : await discoverOAuthServerInfo(url, {
    fetchFn, ...(cached?.resourceMetadataUrl ? { resourceMetadataUrl: new URL(cached.resourceMetadataUrl) } : {}) });
  const issuer = discovery.authorizationServerUrl;
  // Never send credentials saved for another authorization server to a newly discovered issuer.
  if ([information.issuer, tokens.issuer].some((saved) => saved && issuerKey(saved) !== issuerKey(issuer))) {
    throw new InvalidClientError("The connector's authorization server changed. Sign in again.");
  }
  const selectedResource = await selectResourceURL(url, client, discovery.resourceMetadata);
  client.saveDiscoveryState(discovery);
  const refreshed = await refreshAuthorization(issuer, { metadata: discovery.authorizationServerMetadata,
    clientInformation: information, refreshToken: tokens.refresh_token,
    resource: selectedResource && discovery.resourceMetadata ? discovery.resourceMetadata.resource : selectedResource, fetchFn });
  client.saveTokens({ ...refreshed, issuer });
}
