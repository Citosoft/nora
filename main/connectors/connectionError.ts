import { isNodeError } from "@main/nodeErrors";

/** Fetch wraps DNS and socket failures in a generic TypeError; expose the actionable cause instead. */
export function connectorConnectionError(error: unknown, url: string): string | null {
  const host = new URL(url).hostname;
  let cause = error;
  for (let depth = 0; depth < 4 && cause instanceof Error; depth += 1, cause = cause.cause) {
    if (!isNodeError(cause)) continue;
    switch (cause.code) {
      case "ENOTFOUND":
      case "EAI_AGAIN": return `Nora could not resolve ${host}. Check the server URL and your DNS or VPN connection, then retry.`;
      case "ECONNREFUSED": return `The server at ${host} refused the connection. Check that the MCP server is running, then retry.`;
      case "ETIMEDOUT":
      case "UND_ERR_CONNECT_TIMEOUT": return `The connection to ${host} timed out. Check your network or VPN connection, then retry.`;
      case "SELF_SIGNED_CERT_IN_CHAIN":
      case "DEPTH_ZERO_SELF_SIGNED_CERT":
      case "UNABLE_TO_GET_ISSUER_CERT_LOCALLY":
      case "UNABLE_TO_VERIFY_LEAF_SIGNATURE": return `Nora could not verify the certificate for ${host}. Ask your administrator to install the server's certificate authority in your system trust store, then restart Nora.`;
      case "CERT_HAS_EXPIRED": return `The certificate for ${host} has expired. Ask the server administrator to renew it, then retry.`;
      case "ERR_TLS_CERT_ALTNAME_INVALID": return `The certificate does not match ${host}. Check the server URL or ask the server administrator to correct its certificate.`;
    }
  }
  return null;
}
