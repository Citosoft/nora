import { App, applyDocumentTheme, applyHostStyleVariables } from "@modelcontextprotocol/ext-apps";
import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import type { BuildHealth, BuildRange } from "../types/mcpApp.types";
import { isBuildRange, simulatedMcpApp } from "../mcpApp";

/**
 * A real MCP Apps view, bundled into the simulated widget document. It talks to Nora only through the
 * official `App` client, so it exercises the same handshake, notifications and requests a third-party widget would.
 */
const app = new App({ name: "Simulated build dashboard", version: "1.0.0" }, {});
const root = document.getElementById("root");
let health: BuildHealth | null = null;
let status = "Waiting for the tool result…";

function isBuildHealth(value: unknown): value is BuildHealth {
  if (typeof value !== "object" || value === null || !("days" in value) || !("range" in value) || !("project" in value)) return false;
  return Array.isArray(value.days) && isBuildRange(value.range) && typeof value.project === "string";
}

function applyContext(context: McpUiHostContext | undefined): void {
  if (context?.theme) applyDocumentTheme(context.theme);
  if (context?.styles?.variables) applyHostStyleVariables(context.styles.variables);
}

function button(label: string, action: () => void, options: { pressed?: boolean; disabled?: boolean } = {}): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button"; element.textContent = label; element.disabled = options.disabled ?? false;
  if (options.pressed !== undefined) element.setAttribute("aria-pressed", String(options.pressed));
  element.addEventListener("click", action);
  return element;
}

async function chooseRange(range: BuildRange): Promise<void> {
  status = `Asking the server for ${range === "7d" ? "7" : "30"} days…`; render();
  try {
    const result = await app.callServerTool({ name: simulatedMcpApp.historyTool, arguments: { project: simulatedMcpApp.project, range } });
    const text = result.content.find((block) => block.type === "text");
    if (result.isError || !isBuildHealth(result.structuredContent)) status = text?.type === "text" ? text.text : "The server returned no build history.";
    else { health = result.structuredContent; status = `Updated by ${simulatedMcpApp.historyTool}.`; }
  } catch (cause) {
    status = cause instanceof Error ? cause.message : "The tool call failed.";
  }
  render();
}

async function askAboutFailures(): Promise<void> {
  const failed = health?.days.filter((day) => day.failed > 0).map((day) => day.label).join(", ") || "none";
  await app.sendMessage({ role: "user", content: [{ type: "text", text: `Why did the ${health?.project ?? "example"} builds fail on: ${failed}?` }] });
  status = "Suggested a message in the composer."; render();
}

function render(): void {
  if (!root) return;
  const canCall = Boolean(app.getHostCapabilities()?.serverTools);
  const chart = document.createElement("div"); chart.className = "chart"; chart.setAttribute("role", "img");
  const days = health?.days ?? [];
  const peak = Math.max(1, ...days.map((day) => day.passed + day.failed));
  chart.setAttribute("aria-label", `${days.length} days of builds`);
  for (const day of days) {
    const bar = document.createElement("div"); bar.className = "bar"; bar.title = `${day.label}: ${day.passed} passed, ${day.failed} failed`;
    const passed = document.createElement("span"); passed.className = "passed"; passed.style.height = `${(day.passed / peak) * 100}%`;
    const failed = document.createElement("span"); failed.className = "failed"; failed.style.height = `${(day.failed / peak) * 100}%`;
    bar.append(failed, passed); chart.append(bar);
  }
  const range = health?.range ?? "7d";
  const controls = document.createElement("div"); controls.className = "controls";
  controls.append(
    button("7 days", () => void chooseRange("7d"), { pressed: range === "7d", disabled: !canCall || !health }),
    button("30 days", () => void chooseRange("30d"), { pressed: range === "30d", disabled: !canCall || !health }),
    button("Ask about failures", () => void askAboutFailures(), { disabled: !health }));
  const title = document.createElement("h1"); title.textContent = health ? `Build health · ${health.project}` : "Build health";
  const note = document.createElement("p"); note.className = "status"; note.setAttribute("role", "status");
  note.textContent = canCall ? status : `${status} This host doesn't run tool calls from widgets, so the range is fixed.`;
  root.replaceChildren(title, chart, controls, note);
}

app.ontoolinput = () => { status = "Tool called; waiting for its result…"; render(); };
app.ontoolresult = (result) => {
  if (isBuildHealth(result.structuredContent)) { health = result.structuredContent; status = "Showing the tool's result."; }
  else status = "The tool result had no build data.";
  render();
};
app.ontoolcancelled = () => { status = "The tool call was cancelled."; render(); };
app.onhostcontextchanged = (context) => applyContext(context);

void app.connect().then(() => { applyContext(app.getHostContext()); render(); })
  .catch((cause: unknown) => { status = cause instanceof Error ? cause.message : "Could not connect to the host."; render(); });
