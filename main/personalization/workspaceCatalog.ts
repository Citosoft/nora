import { mkdir, readFile, writeFile, rename, rm, lstat, realpath } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, isAbsolute } from "node:path";
import { nativeWorkspaceIndexSchema } from "@shared/personalization/workspaces";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { WorkspaceCatalogOptions, WorkspaceCatalog } from "@main/types/personalization/services.types";
import { isNodeError } from "@main/nodeErrors";

/** Only the filesystem owner supplies paths. Persist identity so replacement never silently rebinds history. */
export async function openWorkspaceCatalog(options: WorkspaceCatalogOptions): Promise<WorkspaceCatalog> {
  if (!isAbsolute(options.indexPath) || !isAbsolute(options.personalPath)) throw new Error("Workspace storage must use absolute host-owned paths");
  let workspaces: NativeWorkspace[] = [];
  try {
    workspaces = nativeWorkspaceIndexSchema.parse(JSON.parse(await readFile(options.indexPath, "utf8"))).workspaces;
    const ids = new Set(workspaces.map((entry) => entry.id));
    if (ids.size !== workspaces.length || workspaces.some((entry) => entry.id !== entry.workspace.projectId || entry.workspace.environmentId !== options.environmentId)) {
      throw new Error("Workspace registry identity is inconsistent");
    }
  } catch (error) { if (!isNodeError(error) || error.code !== "ENOENT") throw error; }
  let pending = Promise.resolve();
  const serialize = <T>(work: () => Promise<T>): Promise<T> => {
    const result = pending.then(work); pending = result.then(() => {}, () => {}); return result;
  };
  const persist = async (next: NativeWorkspace[]): Promise<void> => {
    await mkdir(dirname(options.indexPath), { recursive: true, mode: 0o700 });
    const temporary = `${options.indexPath}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, JSON.stringify({ version: 1, workspaces: next }), { mode: 0o600, flag: "wx" });
      await rename(temporary, options.indexPath);
      workspaces = next;
    } finally { await rm(temporary, { force: true }); }
  };
  const admit = async (path: string, name: string, personal: boolean): Promise<NativeWorkspace> => {
    const canonical = await realpath(path);
    const previous = workspaces.find((entry) => entry.workspace.path === canonical);
    if (previous) {
      // Catalog selections follow branch switches; conversation snapshots remain pinned.
      const current = await options.prepare(previous.workspace);
      const refreshed = { ...previous, workspace: { ...previous.workspace, branch: current.branch } };
      await options.authority.verify(refreshed.workspace);
      if (current.branch !== previous.workspace.branch) {
        await persist(workspaces.map((entry) => entry.id === previous.id ? refreshed : entry));
      }
      return structuredClone(refreshed);
    }
    const id = personal ? `personal:${options.environmentId}` : randomUUID();
    const workspace = await options.prepare({ projectId: id, environmentId: options.environmentId,
      checkoutId: `registration:${id}`, path: canonical, branch: "", access: "write" });
    // A trusted one-shot registration is supplied by the catalog's composition during admission.
    if (personal && (workspace.path !== canonical || workspace.versionControl === "git")) throw new Error("Personal storage must be outside a repository");
    const entry: NativeWorkspace = { id, name, kind: personal ? "personal" : workspace.versionControl === "git" ? "repository" : "folder", workspace };
    await persist([...workspaces, entry]);
    return structuredClone(entry);
  };
  return {
    list: () => structuredClone(workspaces),
    registrations: () => workspaces.map(({ workspace }) => ({ projectId: workspace.projectId, checkoutId: workspace.checkoutId, path: workspace.path })),
    ensurePersonal: () => serialize(async () => {
      const existing = workspaces.find((entry) => entry.kind === "personal");
      if (existing) { await options.authority.verify(existing.workspace); return structuredClone(existing); }
      await mkdir(dirname(options.personalPath), { recursive: true, mode: 0o700 });
      try { await mkdir(options.personalPath, { mode: 0o700 }); }
      catch (error) { if (!isNodeError(error) || error.code !== "EEXIST") throw error; }
      const info = await lstat(options.personalPath);
      if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Personal storage is not a regular directory");
      return admit(options.personalPath, "Personal", true);
    }),
    addFolder: (path, name) => serialize(() => admit(path, name, false)),
    bindProject: (projectId, path, name) => serialize(async () => {
      const entry = await admit(path, name, false);
      const bound = { ...entry, shellProjectId: projectId };
      await persist(workspaces.map((workspace) => workspace.id === entry.id ? bound : workspace));
      return structuredClone(bound);
    })
  };
}
