import { roleSelectionSchema } from "@shared/personalization/contracts";
import type { NativeBoot, NativeProvider, PersonalizationRequest } from "@shared/ipc/types/personalizationGateway.types";
import type { WorkspaceCatalog, PersonalizationSettings } from "@main/types/personalization/services.types";
import type { PersonalizationServiceOptions } from "@main/types/personalization/runtime.types";

export class PersonalizationService {
  private pending = Promise.resolve();
  private providers: readonly NativeProvider[];
  constructor(private readonly settings: PersonalizationSettings, private readonly catalog: WorkspaceCatalog,
    private readonly options: PersonalizationServiceOptions) { this.providers = options.providers; }

  state(): NativeBoot {
    return { environmentId: this.options.environmentId, cursor: this.options.cursor(), personalization: structuredClone(this.settings.read().personalization),
      workspaces: this.catalog.list(), providers: this.providers.map((provider: NativeProvider) => ({ ...provider })) };
  }

  request(input: PersonalizationRequest): Promise<NativeBoot> {
    const result = this.pending.then(() => this.apply(input));
    this.pending = result.then(() => {}, () => {});
    return result;
  }

  private async apply(input: PersonalizationRequest): Promise<NativeBoot> {
    switch (input.kind) {
      case "boot": break;
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
      case "add-workspace": {
        const folder = await this.options.chooseFolder();
        if (folder) await this.catalog.addFolder(folder.path, folder.name);
        break;
      }
      case "register-workspace": {
        const project = this.options.resolveProject?.(input.projectId);
        if (!project) throw new Error("This workspace is unavailable on the local execution host");
        await this.catalog.bindProject(input.projectId, project.path, project.name);
        break;
      }
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
