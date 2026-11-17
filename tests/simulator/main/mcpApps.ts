import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { ProviderMcpAppAction, ProviderMcpAppResult } from "@main/types/execution/mcpApp.types";
import { MCP_APP_RESOURCE_MIME_TYPE } from "@shared/conversations/mcpApp";
import { readMcpAppResource } from "@main/providers/mcpApp";
import { isBuildRange, simulatedBuildHealth, simulatedMcpApp, summarizeBuildHealth } from "../mcpApp";

/** Written next to the simulator database by the launcher, which bundles `tests/simulator/widget/buildHealth.ts`. */
export const SIMULATED_WIDGET_SCRIPT = "mcp-app-widget.js";

// Styled only with the MCP Apps style variables, so the widget follows whatever theme the host sends.
const styles = `
:root { color-scheme: light dark; }
body { margin: 0; padding: 12px 14px; font: 13px/1.4 var(--font-sans, system-ui, sans-serif);
  background: var(--color-background-primary, Canvas); color: var(--color-text-primary, CanvasText); }
h1 { margin: 0 0 10px; font-size: 13px; font-weight: 600; }
.chart { display: flex; align-items: flex-end; gap: 3px; height: 96px; padding: 6px; border-radius: var(--border-radius-md, 6px);
  background: var(--color-background-secondary, transparent); }
.bar { display: flex; flex: 1; flex-direction: column; justify-content: flex-end; height: 100%; min-width: 3px; }
.passed { background: var(--color-text-secondary, gray); border-radius: 2px 2px 0 0; }
.failed { background: var(--color-text-danger, crimson); }
.controls { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
button { font: inherit; padding: 4px 10px; cursor: pointer; border-radius: var(--border-radius-md, 6px); color: inherit;
  border: 1px solid var(--color-border-primary, gray); background: var(--color-background-primary, transparent); }
button[aria-pressed="true"] { background: var(--color-background-inverse, CanvasText); color: var(--color-text-inverse, Canvas); }
button:disabled { cursor: default; opacity: .5; }
button:focus-visible { outline: 2px solid var(--color-ring-primary, Highlight); outline-offset: 1px; }
.status { margin: 8px 0 0; color: var(--color-text-secondary, gray); font-size: 12px; }`;

function widgetDocument(script: string): string {
  // A bundle can contain "</script" inside strings; escape it so it cannot close the element early.
  return `<!doctype html><html><head><meta charset="utf-8"><style>${styles}</style></head>`
    + `<body><main id="root"></main><script>${script.replaceAll("</script", "<\\/script")}</script></body></html>`;
}

/**
 * The simulated Build dashboard server's MCP Apps side: it serves its widget and answers the widget's own
 * `build_history` calls with synthetic data. Nothing leaves the process.
 */
export async function runSimulatedMcpApp(conversation: Conversation, action: ProviderMcpAppAction): Promise<ProviderMcpAppResult> {
  if (action.server !== simulatedMcpApp.server) return { kind: "unavailable", message: `${action.server} is not a simulated widget server.` };
  if (action.kind === "read-resource") {
    if (action.uri !== simulatedMcpApp.resourceUri) return { kind: "unavailable", message: `${action.uri} is not a simulated widget.` };
    const script = await readFile(join(conversation.workspace.path, SIMULATED_WIDGET_SCRIPT), "utf8").catch(() => null);
    if (script === null) return { kind: "unavailable", message: "The simulated widget was not built. Start the simulator with npm run dev:chat-simulator." };
    // The same validation a real server's reply goes through.
    const resource = readMcpAppResource([{ uri: action.uri, mimeType: MCP_APP_RESOURCE_MIME_TYPE, text: widgetDocument(script), _meta: { ui: { prefersBorder: true } } }]);
    return resource ? { kind: "resource", resource } : { kind: "unavailable", message: "The simulated widget document was rejected." };
  }
  if (action.tool !== simulatedMcpApp.historyTool) return { kind: "unavailable", message: `${action.tool} is not offered to widgets.` };
  const range = action.arguments.range;
  if (!isBuildRange(range)) return { kind: "tool-result", result: { content: [{ type: "text", text: "Choose a range of 7d or 30d." }], isError: true } };
  const health = simulatedBuildHealth(range);
  return { kind: "tool-result", result: { content: [{ type: "text", text: summarizeBuildHealth(health) }], structuredContent: health } };
}
