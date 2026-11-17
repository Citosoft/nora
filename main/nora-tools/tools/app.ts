import { agentSettingsPatchSchema } from "@shared/nora-tools/settings";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { NORA_TOOLS } from "@shared/nora-tools/catalog";
import type { NoraToolContext, NoraToolDeps } from "@main/types/nora-tools/noraTools.types";
import { runTool } from "./result";

const MODELS_SHOWN = 30;

export function registerAppTools(server: McpServer, context: NoraToolContext, deps: NoraToolDeps): void {
  server.registerTool("get_settings", { ...NORA_TOOLS.get_settings, annotations: { readOnlyHint: true, openWorldHint: false } },
    () => runTool(async () => JSON.stringify(await deps.settings.read(), null, 2)));
  server.registerTool("update_settings", { ...NORA_TOOLS.update_settings, inputSchema: agentSettingsPatchSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false } },
    (patch) => runTool(async () => JSON.stringify(await deps.settings.update(patch), null, 2)));
  server.registerTool("list_workspaces", { ...NORA_TOOLS.list_workspaces, annotations: { readOnlyHint: true, openWorldHint: false } }, () => runTool(() =>
    deps.app.workspaces(context).map((workspace) => `- ${workspace.name}${workspace.current ? " (this thread)" : ""}: ${workspace.kind}, ${workspace.path}`
      + `${workspace.branch ? `, branch ${workspace.branch}` : ""}`).join("\n") || "No workspaces are open."));
  server.registerTool("list_models", { ...NORA_TOOLS.list_models, annotations: { readOnlyHint: true, openWorldHint: false } }, () => runTool(async () => {
    const providers = await deps.app.models(context);
    if (!providers.length) return "No providers are installed.";
    return providers.map((provider) => {
      const heading = `- ${provider.label} (provider ${provider.kind}${provider.instanceId !== provider.kind ? `, instance ${provider.instanceId}` : ""})`;
      if (provider.unavailable) return `${heading}: models unavailable — ${provider.unavailable}`;
      const extra = provider.models.length > MODELS_SHOWN ? `, and ${provider.models.length - MODELS_SHOWN} more` : "";
      return `${heading}: ${provider.models.slice(0, MODELS_SHOWN).join(", ")}${extra}`;
    }).join("\n");
  }));
}
