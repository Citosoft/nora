import { idleCompactionModeSchema, roleSelectionSchema, threadModelDefaultSchema, threadPreferencesPatchSchema } from "@shared/personalization/contracts";
import type { NativeBoot, NativeProvider, PersonalizationRequest } from "@shared/ipc/types/personalizationGateway.types";
import type { WorkspaceCatalog, PersonalizationSettings } from "@main/types/personalization/services.types";
import type { PersonalizationServiceOptions } from "@main/types/personalization/runtime.types";
import { applyBotRequest, isBotRequest } from "@main/bots/botRequests";
import { withFavoriteModel } from "@shared/personalization/favoriteModels";
import { noraToolsStatus } from "@shared/nora-tools/catalog";

export class PersonalizationService {
  private pending = Promise.resolve();
  private providers: readonly NativeProvider[];
  private readonly listeners = new Set<(state: NativeBoot) => void>();
  constructor(private readonly settings: PersonalizationSettings, private readonly catalog: WorkspaceCatalog,
    private readonly options: PersonalizationServiceOptions) { this.providers = options.providers; }

  state(): NativeBoot {
    return { environmentId: this.options.environmentId, cursor: this.options.cursor(), personalization: structuredClone(this.settings.read().personalization),
      workspaces: this.catalog.list(), providers: this.providers.map((provider: NativeProvider) => ({ ...provider })),
      sharedBots: this.options.bots?.list() ?? [], noraTools: noraToolsStatus(this.options.noraToolsRunning?.() ? "running" : "idle") };
  }

  /** Every applied change, including ones made from a thread's tools rather than the window. */
  subscribe(listener: (state: NativeBoot) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /** Registers a project's current worktrees as checkouts of its workspace, publishing when they changed. */
  async syncCheckouts(projectId: string): Promise<void> {
    if (!this.options.projectCheckouts) return;
    if (await this.catalog.setProjectCheckouts(projectId, this.options.projectCheckouts(projectId))) this.publish();
  }

  /** Pushes the current state for changes that did not come through a request, such as the tool server starting. */
  publish(): void {
    const state = this.state();
    for (const listener of this.listeners) listener(state);
  }

  request(input: PersonalizationRequest): Promise<NativeBoot> {
    const result = this.pending.then(() => this.apply(input)).then((state) => {
      for (const listener of this.listeners) listener(state);
      return state;
    });
    this.pending = result.then(() => {}, () => {});
    return result;
  }

  private async apply(input: PersonalizationRequest): Promise<NativeBoot> {
    if (isBotRequest(input)) {
      if (!this.options.bots) throw new Error("Bots are unavailable in this environment");
      await applyBotRequest(input, this.settings, { workspaces: () => this.catalog.list(), library: this.options.bots, createRoutines: this.options.createRoutines });
      return this.state();
    }
    switch (input.kind) {
      case "set-thread-preferences": {
        const patch = threadPreferencesPatchSchema.parse(input.patch);
        await this.settings.update((current) => ({ ...current, personalization: { ...current.personalization,
          threads: { ...current.personalization.threads, ...patch } } }));
        break;
      }
      case "set-idle-compaction": {
        const idleCompaction = idleCompactionModeSchema.parse(input.mode);
        await this.settings.update((current) => ({ ...current, personalization: { ...current.personalization, idleCompaction } }));
        break;
      }
      case "boot": await this.options.bots?.refresh(this.catalog.list()); break;
      case "refresh-providers":
        if (this.options.refreshProviders) this.providers = await this.options.refreshProviders();
        break;
      case "onboard": {
        const role = roleSelectionSchema.parse(input.role);
        // Durable workspace first: failure must leave first-run selection retryable.
        const personal = await this.catalog.ensurePersonal();
        await this.options.activateWorkspace?.(personal.workspace.path);
        await this.settings.update((current) => ({ ...current, personalization: { ...current.personalization, defaultRole: role } }));
        break;
      }
      case "set-role": {
        if (!input.workspaceId && !input.role) throw new Error("Choose an app default role");
        if (input.workspaceId && !this.catalog.list().some((entry) => entry.id === input.workspaceId)) throw new Error("Select an existing workspace");
        await this.settings.update((current) => {
          const personalization = structuredClone(current.personalization);
          if (input.workspaceId) {
            if (input.role) personalization.workspaceRoles[input.workspaceId] = roleSelectionSchema.parse(input.role);
            else delete personalization.workspaceRoles[input.workspaceId];
          } else personalization.defaultRole = input.role;
          return { ...current, personalization };
        });
        break;
      }
      case "set-thread-model": {
        const model = input.model ? threadModelDefaultSchema.parse(input.model) : null;
        const key = input.target === "nora-chat" ? "noraChatModel" : "threadModel";
        await this.settings.update((current) => {
          const personalization = structuredClone(current.personalization);
          if (model) personalization[key] = model;
          else delete personalization[key];
          return { ...current, personalization };
        });
        break;
      }
      case "set-favorite-model": {
        const model = threadModelDefaultSchema.parse(input.model);
        await this.settings.update((current) => {
          const personalization = structuredClone(current.personalization);
          const favorites = withFavoriteModel(personalization.favoriteModels ?? [], model, input.favorite);
          if (favorites.length) personalization.favoriteModels = favorites;
          else delete personalization.favoriteModels;
          return { ...current, personalization };
        });
        break;
      }
      case "add-workspace": {
        const folder = await this.options.chooseFolder();
        if (folder) await this.catalog.addFolder(folder.path, folder.name);
        await this.options.bots?.refresh(this.catalog.list());
        break;
      }
      case "register-workspace": {
        const project = this.options.resolveProject?.(input.projectId);
        if (!project) throw new Error("This workspace is unavailable on the local execution host");
        await this.catalog.bindProject(input.projectId, project.path, project.name);
        await this.syncCheckouts(input.projectId);
        await this.options.bots?.refresh(this.catalog.list());
        break;
      }
      case "sync-checkouts": await this.syncCheckouts(input.projectId); break;
      case "open-workspace-folder": {
        const workspace = this.catalog.list().find((entry) => entry.id === input.workspaceId);
        if (!workspace) throw new Error("Select an existing workspace");
        await this.options.openFolder(workspace.workspace.path);
        break;
      }
    }
    return this.state();
  }
}
