import type { NoraAppOperations } from "@main/types/nora-tools/noraTools.types";
import type { NoraToolOperationOptions } from "@main/types/nora-tools/operations.types";

export function createAppOperations(options: NoraToolOperationOptions): NoraAppOperations {
  return {
    workspaces({ conversation }) {
      return options.boot().workspaces.map((entry) => ({ id: entry.id, name: entry.name, kind: entry.kind, path: entry.workspace.path,
        branch: entry.workspace.versionControl === "git" ? entry.workspace.branch || "detached" : null, current: entry.id === conversation.workspace.projectId }));
    },
    async models({ conversation }) {
      // Catalogs are checkout-scoped, so the thread's own workspace answers for every provider.
      return Promise.all(options.boot().providers.map(async (provider) => {
        const catalog = await options.host.catalog(provider.kind, provider.instanceId, conversation.workspace)
          .catch((): null => null);
        return { kind: provider.kind, instanceId: provider.instanceId, label: provider.label,
          models: catalog?.status === "available" ? catalog.catalog.models.map((model) => model.id) : [],
          unavailable: !catalog ? "the provider could not be reached" : catalog.status === "available" ? null : catalog.failure.message };
      }));
    }
  };
}
