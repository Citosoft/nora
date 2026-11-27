import type { ExternalSessionReader } from "@main/types/execution/externalSessions.types";
import type { NativeSessionLookup } from "@main/types/app-import/appImportSource.types";
import type { NativeProviderKind } from "@shared/types/provider/providerKind.types";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";

/**
 * Preview workspace for the history readers: imported workspaces have no Nora ids yet, and the
 * readers only use `path` to scope sessions (see `isExternalWorkspace`).
 */
function previewWorkspace(cwd: string): WorkspaceRef {
  return { projectId: "app-import-preview", environmentId: "app-import-preview", checkoutId: "app-import-preview", path: cwd, branch: "", access: "read" };
}

/** Session lookup backed by Nora's Claude/Codex external-session readers, listing each provider and cwd once. */
export function createExternalSessionLookup(readers: Partial<Record<NativeProviderKind, ExternalSessionReader>>): NativeSessionLookup {
  const cache = new Map<string, Promise<ReadonlySet<string>>>();
  return {
    listSessionIds(provider, cwd) {
      const reader = readers[provider];
      if (!reader) return Promise.resolve(new Set<string>());
      const key = `${provider}\0${cwd}`;
      let listing = cache.get(key);
      if (!listing) {
        listing = reader.list(previewWorkspace(cwd)).then((sessions) => new Set(sessions.map((session) => session.id)));
        cache.set(key, listing);
      }
      return listing;
    }
  };
}
