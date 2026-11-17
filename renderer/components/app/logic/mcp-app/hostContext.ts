import type { McpUiHostCapabilities, McpUiHostContext, McpUiStyleVariableKey, McpUiStyles } from "@modelcontextprotocol/ext-apps/app-bridge";
import type { McpAppTheme } from "@/components/app/types/mcpApp.types";

/** MCP Apps style variables and the app tokens (HSL triplets unless noted) that supply them. */
const COLOR_TOKENS: Readonly<Partial<Record<McpUiStyleVariableKey, string>>> = {
  "--color-background-primary": "--background",
  "--color-background-secondary": "--muted",
  "--color-background-tertiary": "--accent",
  "--color-background-danger": "--destructive",
  "--color-text-primary": "--foreground",
  "--color-text-secondary": "--muted-foreground",
  "--color-text-danger": "--destructive",
  "--color-text-inverse": "--primary-foreground",
  "--color-background-inverse": "--primary",
  "--color-border-primary": "--border",
  "--color-border-secondary": "--input",
  "--color-ring-primary": "--ring"
};

/** Reads the app's current theme into MCP Apps style variables; tokens the theme lacks are left for the widget's own defaults. */
export function readMcpAppTheme(theme: string | undefined, readToken: (name: string) => string): McpAppTheme {
  const variables: McpAppTheme["variables"] = {};
  for (const [variable, token] of Object.entries(COLOR_TOKENS) as [McpUiStyleVariableKey, string][]) {
    const value = readToken(token).trim();
    if (value) variables[variable] = `hsl(${value})`;
  }
  const font = readToken("--app-ui-font").trim();
  if (font) variables["--font-sans"] = font;
  const radius = readToken("--radius").trim();
  if (radius) variables["--border-radius-md"] = radius;
  return { theme: theme === "dark" ? "dark" : "light", variables };
}

/** What the thread offers widgets; tool calls only where the runtime can run them. */
export function mcpAppHostCapabilities(toolCalls: boolean): McpUiHostCapabilities {
  return { openLinks: {}, message: { text: {} }, ...(toolCalls ? { serverTools: {} } : {}) };
}

export function mcpAppHostContext(theme: McpAppTheme, width: number): McpUiHostContext {
  // The spec lets hosts omit any variable; its generated type lists every key, so the partial set is widened here.
  return { theme: theme.theme, styles: { variables: theme.variables as McpUiStyles }, displayMode: "inline", availableDisplayModes: ["inline"],
    containerDimensions: { maxWidth: Math.round(width), maxHeight: MCP_APP_MAX_HEIGHT },
    locale: navigator.language, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, platform: "desktop" };
}

/** Inline widgets grow with their content up to this height, then scroll inside the frame. */
export const MCP_APP_MAX_HEIGHT = 640;
export const MCP_APP_MIN_HEIGHT = 80;
