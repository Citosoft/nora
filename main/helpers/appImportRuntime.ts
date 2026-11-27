import { realpath } from "node:fs/promises";
import { createAppImportLedger, EMPTY_APP_IMPORT_LEDGER, normalizeAppImportLedger } from "@main/app-import/ledger";
import { currentAppImportEnvironment } from "@main/app-import/environment";
import { createAppImportService } from "@main/app-import/service";
import { createJsonFileStore } from "@main/helpers/jsonFileStore";
import type { ExternalSessionReader } from "@main/types/execution/externalSessions.types";
import type { AppImportProject } from "@main/types/app-import/appImportApply.types";
import type { AppImportRuntimeInput, AppImportService } from "@main/types/app-import/appImportService.types";
import type { AppState } from "@shared/types/session.types";
import type { NativeProviderKind } from "@shared/types/provider/providerKind.types";
import type { ProjectSummary } from "@shared/types/workspace.types";

function knownProjects(state: AppState): ProjectSummary[] {
  return [...new Map([...(state.project ? [state.project] : []), ...state.workspaces.map((entry) => entry.project)].map((project) => [project.id, project])).values()];
}

async function canonicalPath(path: string): Promise<string> {
  try {
    return await realpath(path);
  } catch {
    return path;
  }
}

/** Wires the importer to Nora's project, settings, execution and secret services through narrow ports. */
export function createAppImportRuntime(input: AppImportRuntimeInput): AppImportService {
  const { services } = input;
  const localProjects = (): ProjectSummary[] => knownProjects(services.snapshot.getSnapshot()).filter((project) => project.location?.kind !== "ssh");
  return createAppImportService({
    environment: currentAppImportEnvironment,
    sessionReaders: () => {
      const native = input.native();
      const readers: Partial<Record<NativeProviderKind, ExternalSessionReader>> = {};
      for (const kind of ["claude", "codex"] as const) {
        const provider = native.personalization.state().providers.find((entry) => entry.kind === kind);
        const reader = provider ? native.host.externalSessionReader(provider.kind, provider.instanceId) : null;
        if (reader) readers[kind] = reader;
      }
      return readers;
    },
    onProgress: input.onProgress,
    apply: {
      ledger: createAppImportLedger(createJsonFileStore({ path: input.ledgerPath, nextId: input.nextId, empty: EMPTY_APP_IMPORT_LEDGER, normalize: normalizeAppImportLedger,
        onReadError: (error) => console.warn("[app-import] Could not read the import ledger; treating everything as not yet imported.", error) }), input.now),
      canonicalPath,
      projects: {
        list: () => localProjects().map((project): AppImportProject => ({ id: project.id, rootPath: project.rootPath })),
        activePath: () => services.snapshot.getSnapshot().project?.rootPath ?? null,
        async open(path) {
          const state = await services.workspace.selectProject(path);
          if (state.errorMessage) return { status: "failed", message: state.errorMessage };
          const target = await canonicalPath(path);
          const project = state.project && await canonicalPath(state.project.rootPath) === target ? state.project : null;
          return project ? { status: "opened", project: { id: project.id, rootPath: project.rootPath } } : { status: "failed", message: "Nora couldn't open this folder." };
        },
        register: async (projectId) => await input.native().personalization.request({ kind: "register-workspace", projectId })
      },
      setupScripts: {
        async saveImported(projectId, importerId, scripts) {
          await services.workspace.saveWorkspaceSetupScripts(projectId, { kind: "replace-imported", importerId, scripts });
        }
      },
      terminalPresets: {
        workspacePresets: (projectId) => localProjects().find((project) => project.id === projectId)?.workspaceTerminalPresets ?? [],
        async saveWorkspacePresets(projectId, presets) { await services.workspace.saveWorkspaceTerminalPresets(projectId, presets); },
        globalPresets: () => input.settings.read().terminalPresets ?? [],
        async saveGlobalPresets(presets) { await input.settings.update((current) => ({ ...current, terminalPresets: presets })); }
      },
      conversations: {
        boot: () => input.native().personalization.state(),
        catalog: async (kind, instanceId, workspace) => await input.native().host.catalog(kind, instanceId, workspace),
        execute: async (command) => await input.native().host.execute(command),
        importHistory: async (command, history) => await input.native().host.importHistory(command, history)
      },
      settings: {
        async setThreadModel(model) { await input.native().personalization.request({ kind: "set-thread-model", target: "thread", model }); }
      },
      keybindings: input.keybindings,
      bots: {
        async save(bot, routines) {
          await input.native().personalization.request({ kind: "save-bot", bot, previousScope: null, ...(routines.length ? { initialRoutines: routines } : {}) });
        },
        addMemory: (note) => { input.native().memory.add(note); }
      },
      secrets: {
        has: ({ name, projectId }) => input.native().secrets.vault().some((secret) => secret.name === name && secret.projectId === projectId),
        save: (secret) => input.native().secrets.save(secret)
      }
    }
  });
}
