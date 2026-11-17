import { useSyncExternalStore } from "react";
import type { McpAppTheme } from "@/components/app/types/mcpApp.types";
import { readMcpAppTheme } from "@/components/app/logic/mcp-app/hostContext";

let cached: { key: string; theme: McpAppTheme } | null = null;

function snapshot(): McpAppTheme {
  const root = document.documentElement;
  const style = getComputedStyle(root);
  const theme = readMcpAppTheme(root.dataset.theme, (name) => style.getPropertyValue(name));
  const key = JSON.stringify(theme);
  // A stable object between changes keeps useSyncExternalStore from re-rendering on every read.
  if (cached?.key !== key) cached = { key, theme };
  return cached.theme;
}

function subscribe(onChange: () => void): () => void {
  // The theme and accent are applied as attributes and inline variables on <html>.
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
  return () => observer.disconnect();
}

/** The app's theme as MCP Apps style variables, updated when the user changes theme or accent. */
export function useMcpAppTheme(): McpAppTheme {
  return useSyncExternalStore(subscribe, snapshot);
}
