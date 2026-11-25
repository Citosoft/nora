import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { ConnectorOAuthClient } from "./oauthClient";

/** Let the MCP transport read the server's challenge, including its metadata URL and required scopes, before OAuth. */
export async function authorizeConnector(url: string, provider: ConnectorOAuthClient, code: Promise<string>, signal: AbortSignal,
  fetchFn: typeof fetch = fetch): Promise<void> {
  const client = new Client({ name: "nora", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(url), { authProvider: provider,
    fetch: (input, init) => fetchFn(input, { ...init, signal: init?.signal ? AbortSignal.any([signal, init.signal]) : signal }) });
  try {
    try { await client.connect(transport, { signal }); }
    catch (error) {
      if (!(error instanceof UnauthorizedError) || !provider.signInRequired) throw error;
      await transport.finishAuth(await code);
    }
  } finally {
    await client.close();
  }
}
