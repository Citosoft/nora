import type { Connector } from "@shared/types/connectors/connectors.types";
import type { ComposerConnectorBadge, ComposerConnectorLogo } from "@/components/app/types/noraConnectors.types";
import type { ThreadConnectorsSummary } from "@/components/app/types/threadConnectors.types";

/** How many logos the composer pill overlaps before the count carries the rest. */
export const COMPOSER_CONNECTOR_LOGO_LIMIT = 3;

/**
 * Counts both sources a thread's connectors come from: enabled Nora connectors available to it, and its provider runtime's own.
 * Logos with a known image come first, so the pill shows recognisable marks before generic server glyphs.
 */
export function composerConnectorBadge(nora: readonly Connector[], provider: ThreadConnectorsSummary | null): ComposerConnectorBadge {
  const enabled = nora.filter((connector) => connector.enabled);
  const servers = provider?.status === "ready" ? provider.servers : [];
  const logos: ComposerConnectorLogo[] = [
    ...enabled.map((connector) => ({ key: `nora:${connector.id}`, logo: connector.logo })),
    ...servers.map((server) => ({ key: `provider:${server.name}`, logo: server.logo }))
  ];
  return {
    count: logos.length,
    needsSignIn: enabled.some((connector) => connector.status === "needs-auth") || servers.some((server) => server.status === "needs-auth"),
    logos: [...logos.filter((entry) => entry.logo), ...logos.filter((entry) => !entry.logo)].slice(0, COMPOSER_CONNECTOR_LOGO_LIMIT)
  };
}
