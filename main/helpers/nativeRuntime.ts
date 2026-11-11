import { generateThreadName } from "@main/ai/threadNameGenerator";
import { join } from "node:path";
import { openLocalHost } from "@main/execution/localHost";
import { LocalWorkspaceAuthority } from "@main/execution/localWorkspace";
import { createCheckoutInspector } from "@main/execution/workspaceGit";
import { openWorkspaceCatalog } from "@main/personalization/workspaceCatalog";
import { PersonalizationService } from "@main/personalization/service";
import { discoverNativeProviders } from "@main/helpers/nativeProviderDiscovery";
import { buildProcessEnv } from "@main/processEnv";
import { effectiveRole } from "@shared/personalization/profiles";
import { restoreWorkspaceSelection } from "@main/helpers/restoreWorkspaceSelection";
import type { NativeRuntimeOptions, NativeRuntime } from "@main/types/native-runtime/runtime.types";
import type { WorkspaceCatalog } from "@main/types/personalization/services.types";

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
  for (const project of options.projects()) {
    if (project.location?.kind !== "ssh") {
      await restoreWorkspaceSelection(async () => {
        await catalog.bindProject(project.id, project.rootPath, project.name);
      });
    }
  }
  const activateWorkspace = async (selectedPath: string): Promise<void> => {
    await options.activateWorkspace(selectedPath);
    const project = options.projects().find((entry) => entry.rootPath === selectedPath && entry.location?.kind !== "ssh");
    if (project) await catalog.bindProject(project.id, project.rootPath, project.name);
  };
  if (options.readSettings().personalization.defaultRole) {
    await restoreWorkspaceSelection(async () => {
      const personal = await catalog.ensurePersonal();
      if (!options.projects().length) await activateWorkspace(personal.workspace.path);
    });
  }
  const discovered = await discoverNativeProviders(buildProcessEnv(process.env));
  const instances = discovered.map((entry) => entry.instance);
  const providers = discovered.map((entry) => entry.provider);
  const host = await openLocalHost({ environmentId, databasePath: join(options.stateDirectory, "execution.sqlite"), gitExecutable: "git", instances,
    generateThreadName: (instruction, signal) => generateThreadName(options.readSettings().ai, instruction, signal),
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
