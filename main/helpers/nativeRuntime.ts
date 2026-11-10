import { join } from "node:path";
import { openLocalHost } from "@main/execution/localHost";
import { LocalWorkspaceAuthority } from "@main/execution/localWorkspace";
import { createCheckoutInspector } from "@main/execution/workspaceGit";
import { openWorkspaceCatalog } from "@main/personalization/workspaceCatalog";
import { PersonalizationService } from "@main/personalization/service";
import { findExecutableOnPath } from "@main/processLookup";
import { buildProcessEnv } from "@main/processEnv";
import { effectiveRole } from "@shared/personalization/profiles";
import type { NativeRuntimeOptions, NativeRuntime } from "@main/types/native-runtime/runtime.types";
import type { WorkspaceCatalog } from "@main/types/personalization/services.types";
import type { NativeInstance } from "@main/types/execution/localHost.types";
import type { NativeProvider } from "@shared/ipc/types/personalizationGateway.types";

/** One native execution owner; the workspace service continues to own files, Git and manual shells. */
export async function openNativeRuntime(options: NativeRuntimeOptions): Promise<NativeRuntime> {
  const environmentId = "local";
  const inspectCheckout = createCheckoutInspector("git");
  let catalog: WorkspaceCatalog | undefined;
  const authority = new LocalWorkspaceAuthority({ environmentId, inspectCheckout, registrations: () => catalog?.registrations() ?? [] });
  catalog = await openWorkspaceCatalog({ environmentId, indexPath: join(options.stateDirectory, "native-workspaces.json"),
    personalPath: options.personalDirectory, authority,
    prepare: (selection) => new LocalWorkspaceAuthority({ environmentId, inspectCheckout,
      registrations: () => [{ projectId: selection.projectId, checkoutId: selection.checkoutId, path: selection.path }] }).prepare(selection) });
  // Admission is explicit and host-owned. SSH projects never get rebound to a local process.
  for (const project of options.projects()) if (project.location?.kind !== "ssh") await catalog.bindProject(project.id, project.rootPath, project.name);
  const activateWorkspace = async (selectedPath: string): Promise<void> => {
    await options.activateWorkspace(selectedPath);
    const project = options.projects().find((entry) => entry.rootPath === selectedPath && entry.location?.kind !== "ssh");
    if (project) await catalog.bindProject(project.id, project.rootPath, project.name);
  };
  if (options.readSettings().personalization.defaultRole) {
    const personal = await catalog.ensurePersonal();
    if (!options.projects().length) await activateWorkspace(personal.workspace.path);
  }
  const [codex, claude] = await Promise.all([
    findExecutableOnPath(process.platform === "win32" ? ["codex.exe", "codex.cmd", "codex"] : ["codex"], process.platform === "win32"),
    findExecutableOnPath(process.platform === "win32" ? ["claude.exe", "claude.cmd", "claude"] : ["claude"], process.platform === "win32")
  ]);
  const instances: NativeInstance[] = [];
  const providers: NativeProvider[] = [];
  const environment = buildProcessEnv(process.env);
  if (codex) {
    instances.push({ kind: "codex", options: { instanceId: "local", executable: codex, arguments: ["app-server", "--listen", "stdio://"], environment,
      policies: { "read-only": { approvalPolicy: "on-request", sandbox: "read-only" }, "workspace-write": { approvalPolicy: "on-request", sandbox: "workspace-write" } } } });
    providers.push({ kind: "codex", instanceId: "local", label: "Codex" });
  }
  if (claude) {
    instances.push({ kind: "claude", instanceId: "local", runtime: { executablePath: claude, environment }, policies: { default: "default", plan: "plan", "accept-edits": "acceptEdits" } });
    providers.push({ kind: "claude", instanceId: "local", label: "Claude" });
  }
  const host = await openLocalHost({ environmentId, databasePath: join(options.stateDirectory, "execution.sqlite"), gitExecutable: "git", instances,
    registrations: () => catalog.registrations(), roleForWorkspace: (id) => effectiveRole(options.readSettings().personalization, id),
    onFailure: (failure) => console.error(`Native execution: ${failure.message}`) });
  const personalization = new PersonalizationService({ read: options.readSettings,
    update: (change) => options.saveSettings(change(options.readSettings())) }, catalog, { environmentId, providers, cursor: () => host.eventCursor(),
    chooseFolder: options.chooseFolder, openFolder: options.openFolder, activateWorkspace,
    resolveProject: (id) => {
      const project = options.projects().find((entry) => entry.id === id && entry.location?.kind !== "ssh");
      return project ? { path: project.rootPath, name: project.name } : null;
    } });
  return { host, personalization, catalog };
}
