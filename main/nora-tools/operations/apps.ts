import { connectorSubjectOf } from "@shared/connectors/access";
import type { NoraAppsOperations, NoraToolContext } from "@main/types/nora-tools/noraTools.types";
import type { NoraToolOperationOptions } from "@main/types/nora-tools/operations.types";
import { appBuilderGuide } from "@main/apps/builderGuide";
import { connectorsChosenBy } from "@main/nora-tools/runContext";

const DESCRIPTION_CHARS = 300;
const clip = (text: string | undefined): string => !text ? "" : text.length > DESCRIPTION_CHARS ? `${text.slice(0, DESCRIPTION_CHARS)}…` : text;

/** Apps act as Nora in the thread's workspace, so a thread can only build on connectors that workspace's Nora threads get. */
export function createAppsOperations(options: Pick<NoraToolOperationOptions, "apps" | "connectorTools">): NoraAppsOperations {
  const subject = (context: NoraToolContext) => connectorSubjectOf(context.conversation);
  /** The app this thread builds: the one its source names, else the one it created. */
  const ownedApp = (context: NoraToolContext): string | null => {
    const source = context.conversation.source;
    if (source?.kind === "app" && source.appId) return source.appId;
    return options.apps.list().find((app) => app.threadId === context.conversation.id)?.id ?? null;
  };
  return {
    guide: appBuilderGuide,
    async listConnectorTools(connectorId, context) {
      options.apps.buildStep(context.conversation.id, "connectors");
      const allowed = connectorsChosenBy(context.conversation);
      const connectors = options.connectorTools.available(subject(context)).filter((connector) => !allowed || allowed.includes(connector.id));
      if (!connectors.length) return "No connectors are available here. The user can add one in Settings → Connectors.";
      const chosen = connectorId ? connectors.filter((connector) => connector.id === connectorId) : connectors;
      if (!chosen.length) return `No connector with id ${connectorId} is available here.`;
      return chosen.map((connector) => {
        const status = connector.status === "connected" ? "" : ` [${connector.status}${connector.message ? `: ${connector.message}` : ""}]`;
        const tools = connector.tools.map((tool) => connectorId
          ? `  - ${tool.name}: ${clip(tool.description)}\n    input: ${tool.inputSchema ? JSON.stringify(tool.inputSchema) : "none recorded"}`
          : `  - ${tool.name}: ${clip(tool.description)}`).join("\n");
        return `${connector.name} (connectorId ${connector.id})${status}\n${tools || "  (no tools)"}`;
      }).join("\n\n") + (connectorId ? "" : "\n\nPass connector_id to see a connector's tool input schemas.");
    },
    sample: (input, context) => {
      const name = options.connectorTools.available(subject(context)).find((connector) => connector.id === input.connectorId)?.name ?? input.tool;
      options.apps.buildStep(context.conversation.id, "sample", name);
      return options.apps.sample({ kind: "connector", appId: ownedApp(context), threadId: context.conversation.id, sourceId: input.sourceId,
        connectorId: input.connectorId, tool: input.tool, args: input.args, subject: subject(context) });
    },
    sampleFile: (input, context) => {
      options.apps.buildStep(context.conversation.id, "sample", input.path.split("/").pop() ?? input.path);
      return options.apps.sample({ kind: "file", appId: ownedApp(context), threadId: context.conversation.id, sourceId: input.sourceId, path: input.path });
    },
    async create(input, context) {
      const owned = ownedApp(context);
      if (owned) throw new Error(`This thread already builds app ${owned}; call update_app with that id instead of creating another app.`);
      options.apps.buildStep(context.conversation.id, "save");
      const app = await options.apps.create({ name: input.name, workspaceId: context.conversation.workspace.projectId, threadId: context.conversation.id, spec: input.spec, suggestions: input.suggestions ?? [], ...(input.icon ? { icon: input.icon } : {}) });
      options.apps.buildStep(context.conversation.id, "saved", app.name);
      return app;
    },
    async update(input, context) {
      const owned = ownedApp(context);
      if (owned && owned !== input.id) throw new Error(`This thread builds app ${owned}; pass that id.`);
      options.apps.buildStep(context.conversation.id, "save");
      const app = await options.apps.update(input);
      options.apps.buildStep(context.conversation.id, "saved", app.name);
      return app;
    },
    read: (id) => ({ app: options.apps.get(id), data: options.apps.data(id) })
  };
}
