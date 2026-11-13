import { NORA_MCP_SERVER_NAME, NORA_TOOL_TIMEOUT_SECONDS, noraAuthorization } from "@main/nora-tools/endpoint";
import type { NoraToolEndpoint } from "@main/types/nora-tools/noraTools.types";

/** Per-thread config overrides that add Nora's streamable HTTP MCP server alongside the user's own servers. */
export function codexNoraToolsConfig(endpoint: NoraToolEndpoint): Record<string, string | number | Record<string, string>> {
  const prefix = `mcp_servers.${NORA_MCP_SERVER_NAME}`;
  return { [`${prefix}.url`]: endpoint.url, [`${prefix}.http_headers`]: { Authorization: noraAuthorization(endpoint) },
    [`${prefix}.tool_timeout_sec`]: NORA_TOOL_TIMEOUT_SECONDS };
}
