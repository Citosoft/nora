import { productFaviconUrl } from "@/components/app/logic/productIcon";
import type { McpServerLogoUrls } from "@/components/app/types/runtimeMcp.types";
import type { McpServerLogo } from "@shared/types/provider/mcp.types";

/** Advertised icons keep their light and dark variants; a domain falls back to its favicon for both themes. */
export function mcpServerLogoUrls(logo: McpServerLogo | undefined): McpServerLogoUrls | null {
  if (!logo) return null;
  if (logo.kind === "icon") return { light: logo.lightUrl, dark: logo.darkUrl };
  const favicon = productFaviconUrl(logo.domain);
  return { light: favicon, dark: favicon };
}
