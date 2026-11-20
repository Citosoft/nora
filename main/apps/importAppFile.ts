import { appSpecConnectorIds, canInstallAppConnector, matchAppFileConnectors, rebindAppFileSpec } from "@shared/apps/portable";
import type { AppsRequest } from "@shared/ipc/types/appsGateway.types";
import type { AppDefinition } from "@shared/types/apps/apps.types";
import type { Connector } from "@shared/types/connectors/connectors.types";
import type { AppsIpcDeps } from "@main/types/apps/apps.types";
import { describeIssues, validateAppSpec } from "./validateAppSpec";

/** Resolves dependencies in main so files cannot bypass workspace access or leave unmapped foreign ids behind. */
export async function importAppFile(deps: Pick<AppsIpcDeps, "apps" | "connectors">, request: Extract<AppsRequest, { kind: "import" }>): Promise<AppDefinition> {
  const { file, workspaceId } = request;
  const available = deps.apps.connectorsFor(workspaceId);
  const matches = matchAppFileConnectors(file, available);
  const bindings: Record<string, string> = {};
  const pending: string[] = [];
  const previews: Connector[] = [];
  for (const id of appSpecConnectorIds(file.spec)) {
    const described = file.connectors[id];
    if (!described) throw new Error("The app file is missing a connector definition. Ask its author to export it again.");
    const localId = request.connectorIds[id] ?? matches[id];
    if (localId) {
      if (!available.some((entry) => entry.id === localId)) throw new Error(`${described.name} is not available in this workspace.`);
      bindings[id] = localId;
    } else {
      if (matchAppFileConnectors(file, deps.connectors.list())[id]) throw new Error(`Enable ${described.name} and allow it in this workspace, then try again.`);
      if (!canInstallAppConnector(described)) throw new Error(`Set up ${described.name} first, then choose it for this app.`);
      bindings[id] = id;
      pending.push(id);
      previews.push({ id, name: described.name, url: described.url, serverName: "import-preview", enabled: true,
        auth: { kind: "oauth", customClient: false, signedIn: false }, access: { workspaces: { kind: "only", ids: [workspaceId] }, bots: { kind: "all" } }, status: "needs-auth", tools: [] });
    }
  }
  // Reject broken specs before creating any connector or contacting its server.
  const validation = await validateAppSpec(rebindAppFileSpec(file.spec, bindings), { connectors: [...available, ...previews], sample: () => undefined, allowUnsampled: true });
  if (!validation.spec) throw new Error(`This app cannot be imported:\n${describeIssues(validation.issues)}`);
  const added: string[] = [];
  try {
    for (const id of pending) {
      // Another dependency may name the same server; resolve it again after each installation.
      const existing = matchAppFileConnectors(file, deps.apps.connectorsFor(workspaceId))[id];
      if (existing) { bindings[id] = existing; continue; }
      const described = file.connectors[id]!;
      const before = new Set(deps.connectors.list().map((entry) => entry.id));
      const connectors = await deps.connectors.create({ name: described.name, url: described.url, auth: { kind: "oauth" },
        access: { workspaces: { kind: "only", ids: [workspaceId] }, bots: { kind: "all" } } });
      const created = connectors.find((entry) => !before.has(entry.id) && entry.name === described.name && entry.url === described.url);
      if (!created) throw new Error(`${described.name} could not be added.`);
      added.push(created.id);
      bindings[id] = created.id;
    }
    return await deps.apps.import({ name: file.name, ...(file.icon ? { icon: file.icon } : {}), workspaceId, spec: rebindAppFileSpec(file.spec, bindings) });
  } catch (error) {
    await Promise.allSettled(added.map((id) => deps.connectors.remove(id)));
    throw error;
  }
}
