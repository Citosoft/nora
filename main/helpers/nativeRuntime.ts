import { generateThreadName } from "@main/ai/threadNameGenerator";
import { join } from "node:path";
import { openLocalHost } from "@main/execution/localHost";
import { createExecutionProvider } from "@main/execution/providerFactory";
import { LocalWorkspaceAuthority } from "@main/execution/localWorkspace";
import { createCheckoutInspector } from "@main/execution/workspaceGit";
import { openWorkspaceCatalog } from "@main/personalization/workspaceCatalog";
import { PersonalizationService } from "@main/personalization/service";
import { discoverNativeProviders } from "@main/helpers/nativeProviderDiscovery";
import { buildProcessEnv } from "@main/processEnv";
import { effectiveRole } from "@shared/personalization/profiles";
import { findEffectiveBot } from "@shared/bots/catalog";
import { createSharedBotLibrary } from "@main/bots/sharedBotLibrary";
import { createNoraToolServer } from "@main/nora-tools/server";
import { createNoraToolOperations } from "@main/nora-tools/operations/index";
import { createRunContextResolver } from "@main/nora-tools/runContext";
import { GroupCoordinator } from "@main/bots/groups/coordinator";
import { createGroupRouter } from "@main/bots/groups/router";
import { openBotMemoryStore } from "@main/bots/memory/store";
import { randomUUID } from "node:crypto";
import type { BotConversationHost } from "@main/types/bots/conversations.types";
import type { ExecutionHost } from "@main/execution/host";
import { threadPreferences } from "@shared/personalization/threads";
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
  const now = (): string => new Date().toISOString();
  const instances = discovered.map((entry) => entry.instance);
  const providers = discovered.map((entry) => entry.provider);
  const readThreadPreferences = () => threadPreferences(options.readSettings().personalization);
  const bots = createSharedBotLibrary();
  // The tool server and the services it calls reference each other; tools only run after startup finishes.
  let host: ExecutionHost | undefined;
  let personalization: PersonalizationService | undefined;
  const started = <T,>(value: T | undefined): T => { if (!value) throw new Error("Nora is still starting. Try again in a moment."); return value; };
  const lazyHost: BotConversationHost = {
    execute: (command) => started(host).execute(command), header: (id) => host?.header(id) ?? null, summaries: () => started(host).summaries(),
    conversationHistory: (query) => started(host).conversationHistory(query), subscribe: (subscription) => started(host).subscribe(subscription),
    eventCursor: () => started(host).eventCursor(), catalog: (kind, instanceId, workspace) => started(host).catalog(kind, instanceId, workspace)
  };
  const memory = openBotMemoryStore(join(options.stateDirectory, "bot-memory.sqlite"), { now: () => new Date().toISOString(), nextId: randomUUID });
  const noraTools = createNoraToolServer(createNoraToolOperations({
    host: lazyHost, nextId: randomUUID, memory,
    readSettings: options.readSettings, updateSettings: options.updateSettings,
    windowSettings: options.windowSettings, settingsSync: options.settingsSync,
    onSettingsChanged: (settings) => { started(personalization).publish(); options.onSettingsChanged(settings); },
    boot: () => started(personalization).state(),
    saveBot: async (bot, previousScope) => { await started(personalization).request({ kind: "save-bot", bot, previousScope }); },
    ...(options.tasks ? { tasks: options.tasks } : {})
  }), () => personalization?.publish());
  const runContext = createRunContextResolver(noraTools, memory);
  await bots.refresh(catalog.list());
  host = await openLocalHost({ runContext, environmentId, databasePath: join(options.stateDirectory, "execution.sqlite"), gitExecutable: "git", instances,
    idleCompactionMode: () => options.readSettings().personalization.idleCompaction ?? "suggest",
    threadPreferences: readThreadPreferences,
    generateThreadName: (instruction, signal) => generateThreadName(options.readSettings().ai, instruction, signal),
    registrations: () => catalog.registrations(), roleForWorkspace: (id) => effectiveRole(options.readSettings().personalization, id),
    botForWorkspace: (workspaceId, botId) => findEffectiveBot(options.readSettings().personalization.bots, workspaceId, bots.list(), botId),
    onFailure: (failure) => console.error(`Native execution: ${failure.message}`) });
  host.adoptProvider(new GroupCoordinator({ host: lazyHost, nextId: randomUUID, now,
    bot: (workspaceId, botId) => findEffectiveBot(options.readSettings().personalization.bots, workspaceId, bots.list(), botId),
    route: createGroupRouter(() => options.readSettings().ai) }));
  personalization = new PersonalizationService({ read: options.readSettings,
    update: options.updateSettings }, catalog, { environmentId, providers, cursor: () => host.eventCursor(),
    refreshProviders: async () => {
      const found = await discoverNativeProviders(buildProcessEnv(process.env));
      for (const entry of found) started(host).adoptProvider(createExecutionProvider(entry.instance, { now, preferences: readThreadPreferences,
        toolOutputDirectory: join(options.stateDirectory, "tool-outputs"), runContext }));
      return found.map((entry) => entry.provider);
    },
    chooseFolder: options.chooseFolder, openFolder: options.openFolder, activateWorkspace, bots, noraToolsRunning: noraTools.running,
    resolveProject: (id) => {
      const project = options.projects().find((entry) => entry.id === id && entry.location?.kind !== "ssh");
      return project ? { path: project.rootPath, name: project.name } : null;
    } });
  const openedHost = host;
  return { host: openedHost, personalization, catalog, memory,
    async shutdown() { await openedHost.shutdown(); await noraTools.close(); memory.close(); } };
}
