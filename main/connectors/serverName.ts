import { NORA_MCP_SERVER } from "@shared/nora-tools/catalog";

const MAX_LENGTH = 40;

/**
 * Derives the name runtimes see from the connector's display name ("Linear (work)" → `linear_work`), unique among connectors and
 * never Nora's own server name.
 */
export function uniqueServerName(name: string, taken: ReadonlySet<string>): string {
  const base = name.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, MAX_LENGTH) || "connector";
  const reserved = (candidate: string) => taken.has(candidate) || candidate === NORA_MCP_SERVER;
  if (!reserved(base)) return base;
  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${base}_${suffix}`;
    if (!reserved(candidate)) return candidate;
  }
}
