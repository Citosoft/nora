import type { McpAppCsp } from "@main/types/execution/mcpApp.types";

function sources(base: readonly string[], origins: readonly string[], fallback = "'none'"): string {
  const all = [...base, ...origins];
  return all.length ? all.join(" ") : fallback;
}

/**
 * The widget's whole policy. MCP Apps' default denies all network access; only https origins the server
 * declared (validated at the provider boundary) are added. Forms may run script handlers but never submit anywhere.
 */
export function buildMcpAppCsp(csp: McpAppCsp): string {
  const resources = csp.resourceDomains;
  return [
    "default-src 'none'",
    `script-src ${sources(["'unsafe-inline'"], resources)}`,
    `style-src ${sources(["'unsafe-inline'"], resources)}`,
    `img-src ${sources(["data:", "blob:"], resources)}`,
    `font-src ${sources(["data:"], resources)}`,
    `media-src ${sources(["data:", "blob:"], resources)}`,
    `connect-src ${sources([], csp.connectDomains)}`,
    `frame-src ${sources([], csp.frameDomains)}`,
    `base-uri ${sources([], csp.baseUriDomains)}`,
    "object-src 'none'",
    "form-action 'none'"
  ].join("; ");
}
