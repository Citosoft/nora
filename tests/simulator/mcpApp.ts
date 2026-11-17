import type { SimulatorStep } from "./types/scenarios.types";
import type { BuildHealth, BuildRange } from "./types/mcpApp.types";

/** The simulated connector whose tool ships an MCP Apps widget. */
export const simulatedMcpApp = {
  server: "Build dashboard",
  tool: "show_build_health",
  /** Called by the widget itself, never by the model. */
  historyTool: "build_history",
  resourceUri: "ui://build-dashboard/health",
  project: "example-app"
} as const;

export function isBuildRange(value: unknown): value is BuildRange { return value === "7d" || value === "30d"; }

/** Deterministic synthetic builds, so repeated runs and tests see the same numbers. */
export function simulatedBuildHealth(range: BuildRange): BuildHealth {
  const count = range === "7d" ? 7 : 30;
  return { project: simulatedMcpApp.project, range, days: Array.from({ length: count }, (_, index) => {
    const day = count - index;
    return { label: day === 1 ? "Today" : `${day - 1}d ago`, passed: 8 + ((index * 7) % 9), failed: index % 5 === 3 ? 3 : index % 4 === 1 ? 1 : 0 };
  }) };
}

export function summarizeBuildHealth(health: BuildHealth): string {
  const failed = health.days.reduce((total, day) => total + day.failed, 0);
  const total = health.days.reduce((sum, day) => sum + day.passed + day.failed, 0);
  return `${health.project}: ${total} builds over ${health.days.length} days, ${failed} failed.`;
}

const initial = simulatedBuildHealth("7d");
export const mcpAppSteps: SimulatorStep[] = [
  { kind: "text", text: `I'll check recent builds with the **${simulatedMcpApp.server}** connector. Its tool comes with an interactive widget, which appears under the call.` },
  { kind: "tool", complete: true, native: { id: "build-health", type: "mcpToolCall", server: simulatedMcpApp.server, tool: simulatedMcpApp.tool,
    arguments: { project: simulatedMcpApp.project, range: "7d" }, status: "completed",
    mcpAppUi: { resourceUri: simulatedMcpApp.resourceUri, preferredModelDisplayMode: "inline" },
    result: { content: [{ type: "text", text: summarizeBuildHealth(initial) }], structuredContent: initial } } },
  { kind: "text", text: "The widget shows the last 7 days. Choose **30 days** to have it call the server's `build_history` tool itself; "
    + "in a Claude thread it reports that tool calls aren't available. **Ask about failures** puts a suggested message in the composer for you to send. "
    + "Toggle the theme to watch the widget follow it." }
];
