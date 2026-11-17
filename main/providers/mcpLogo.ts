import { z } from "zod";
import type { McpLogoSources } from "@main/types/execution/mcpLogo.types";
import type { McpServerLogo } from "@shared/types/provider/mcp.types";
import { mcpServerLogoSchema } from "@shared/providers/mcp";

const iconSchema = z.object({ src: z.string(), theme: z.enum(["light", "dark"]).optional().catch(undefined) });
const serverInfoSchema = z.object({ icons: z.array(z.unknown()).nullish().catch(null), websiteUrl: z.string().nullish().catch(null) });
const COUNTRY_SECOND_LEVEL = /\.(co|com|org|net|ac|gov|edu)\.[a-z]{2}$/;
const IP_HOST = /^[\d.]+$|:/;

function httpsUrl(value: string | null | undefined): URL | null {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === "https:" ? url : null; } catch { return null; }
}

/** `mcp.posthog.com` → `posthog.com`, keeping country second-level suffixes such as `example.co.uk`. */
export function registrableDomain(host: string): string | null {
  const normalized = host.toLowerCase().replace(/\.$/, "");
  if (!normalized.includes(".") || IP_HOST.test(normalized) || normalized.endsWith(".localhost")) return null;
  const labels = normalized.split(".");
  return labels.slice(-(COUNTRY_SECOND_LEVEL.test(normalized) ? 3 : 2)).join(".");
}

function iconLogo(icons: readonly unknown[] | null | undefined): McpServerLogo | null {
  const parsed = (icons ?? []).flatMap((icon) => {
    const result = iconSchema.safeParse(icon);
    return result.success && httpsUrl(result.data.src) ? [result.data] : [];
  });
  const light = parsed.find((icon) => icon.theme !== "dark") ?? parsed[0];
  if (!light) return null;
  const dark = parsed.find((icon) => icon.theme === "dark") ?? light;
  return { kind: "icon", lightUrl: light.src, darkUrl: dark.src };
}

/**
 * Prefers icons the server advertises (MCP `serverInfo.icons`), then its website, then the domain of its HTTP endpoint;
 * local stdio servers have none of these and get no logo.
 */
export function resolveMcpServerLogo({ serverInfo, endpointUrl }: McpLogoSources): McpServerLogo | undefined {
  const info = serverInfoSchema.safeParse(serverInfo);
  const { icons, websiteUrl } = info.success ? info.data : { icons: null, websiteUrl: null };
  const host = httpsUrl(websiteUrl)?.hostname ?? httpsUrl(endpointUrl)?.hostname;
  const domain = host ? registrableDomain(host) : null;
  const logo = iconLogo(icons) ?? (domain ? { kind: "domain", domain } : null);
  const result = mcpServerLogoSchema.safeParse(logo);
  return result.success ? result.data : undefined;
}
