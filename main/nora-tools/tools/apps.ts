import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { NORA_TOOLS } from "@shared/nora-tools/catalog";
import { appSpecInputSchema, appSuggestionsSchema } from "@shared/apps/contracts";
import { appIconSchema } from "@shared/apps/icons";

const icon = appIconSchema.describe("The icon shown beside the app's name: pick the one that best says what the app is for (users for a CRM, receipt for invoices, kanban for a pipeline)");

// Required so every save brings fresh chips; the contract itself defaults to none for imports and older rows.
const suggestions = appSuggestionsSchema.unwrap().min(1).describe("Two or three short next changes the user may want, phrased as requests (\"Add a chart of value by stage\"); shown as one-click chips under the app");
import { connectorIdSchema } from "@shared/connectors/contracts";
import type { AppDefinition, AppRenderData } from "@shared/types/apps/apps.types";
import type { NoraToolContext, NoraToolDeps } from "@main/types/nora-tools/noraTools.types";
import { runTool } from "./result";

const SAMPLE_SHOWN_CHARS = 12_000;
const appId = z.string().trim().min(1).max(128).describe("App id from create_app or read_app");
const sourceStateLine = (sourceId: string, data: AppRenderData): string => {
  const state = data.sourceStates[sourceId];
  if (!state || state.status === "idle") return "not loaded yet";
  if (state.status === "loading") return "loading";
  if (state.status === "ready") { const rows = data.sources[sourceId]; return `${Array.isArray(rows) ? `${rows.length} rows` : "one value"}${state.truncated ? " (cut to the row limit)" : ""}, loaded ${state.fetchedAt}`; }
  return `failed (${state.kind}): ${state.message}`;
};
const describeApp = (app: AppDefinition, data: AppRenderData): string => [
  `${app.name} (id ${app.id}, version ${app.version}, icon ${app.icon}, ${app.trusted ? "trusted" : "writes confirm first"})`,
  "Sources:", ...Object.keys(app.spec.sources).map((sourceId) => `- ${sourceId}: ${sourceStateLine(sourceId, data)}`),
  "Spec:", JSON.stringify(app.spec, null, 2)
].join("\n");

export function registerAppBuilderTools(server: McpServer, context: NoraToolContext, deps: NoraToolDeps): void {
  server.registerTool("app_builder_guide", { ...NORA_TOOLS.app_builder_guide, annotations: { readOnlyHint: true, openWorldHint: false } }, () => runTool(() => deps.apps.guide()));
  server.registerTool("list_connector_tools", { ...NORA_TOOLS.list_connector_tools,
    inputSchema: { connector_id: connectorIdSchema.optional().describe("Show one connector's tools with their input schemas") },
    annotations: { readOnlyHint: true, openWorldHint: false }
  }, (input) => runTool(() => deps.apps.listConnectorTools(input.connector_id, context)));
  server.registerTool("sample_connector_tool", { ...NORA_TOOLS.sample_connector_tool,
    inputSchema: {
      source_id: z.string().trim().min(1).max(64).describe("The source id this sample is for, as it will appear in the spec"),
      connector_id: connectorIdSchema,
      tool: z.string().trim().min(1).max(256),
      args: z.record(z.string(), z.json()).default({}).describe("Arguments the source will pass; use limits or filters to keep the result small")
    },
    annotations: { readOnlyHint: true, openWorldHint: true }
  }, (input) => runTool(async () => {
    const result = await deps.apps.sample({ sourceId: input.source_id, connectorId: input.connector_id, tool: input.tool, args: input.args }, context);
    const text = JSON.stringify(result, null, 2);
    return `Sample kept for source ${input.source_id}. The select expression sees this value:\n${text.length > SAMPLE_SHOWN_CHARS ? `${text.slice(0, SAMPLE_SHOWN_CHARS)}\n… (${text.length.toLocaleString()} characters in all)` : text}`;
  }));
  server.registerTool("sample_file", { ...NORA_TOOLS.sample_file,
    inputSchema: { source_id: z.string().trim().min(1).max(64).describe("The source id this sample is for, as it will appear in the spec"), path: z.string().trim().min(1).max(1024).describe("Absolute path, or ~/… under the home folder") },
    annotations: { readOnlyHint: true, openWorldHint: false }
  }, (input) => runTool(async () => {
    const result = await deps.apps.sampleFile({ sourceId: input.source_id, path: input.path }, context);
    const text = JSON.stringify(result, null, 2);
    return `Sample kept for source ${input.source_id}. The select expression sees this value:\n${text.length > SAMPLE_SHOWN_CHARS ? `${text.slice(0, SAMPLE_SHOWN_CHARS)}\n… (${text.length.toLocaleString()} characters in all)` : text}`;
  }));
  server.registerTool("create_app", { ...NORA_TOOLS.create_app,
    inputSchema: { name: z.string().trim().min(1).max(120).describe("Short name shown in the Apps list"), spec: appSpecInputSchema, suggestions, icon },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  }, (input) => runTool(async () => {
    const app = await deps.apps.create({ name: input.name, spec: input.spec, suggestions: input.suggestions, icon: input.icon }, context);
    return `Created app ${app.name} (id ${app.id}). It is open beside this chat and its sources are loading. Describe what it shows and ask the user what to change; use update_app with this id for changes.`;
  }));
  server.registerTool("update_app", { ...NORA_TOOLS.update_app,
    inputSchema: { id: appId, spec: appSpecInputSchema, summary: z.string().trim().min(1).max(500).describe("One line describing the change, shown in the app's version history"), suggestions, icon: icon.describe("The app's icon: repeat the current one (read_app shows it) unless it is layout-dashboard or the app's purpose changed, then pick one that fits") },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  }, (input) => runTool(async () => {
    const app = await deps.apps.update({ id: input.id, spec: input.spec, summary: input.summary, suggestions: input.suggestions, icon: input.icon }, context);
    return `Saved version ${app.version} of ${app.name}. The app refreshed beside this chat.`;
  }));
  server.registerTool("read_app", { ...NORA_TOOLS.read_app, inputSchema: { id: appId }, annotations: { readOnlyHint: true, openWorldHint: false } },
    (input) => runTool(() => { const { app, data } = deps.apps.read(input.id, context); return describeApp(app, data); }));
}
