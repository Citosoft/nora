import type { WorkspaceImportDeps, WorkspaceImportFailure } from "@/components/app/types/workspaceImport.types";

export async function importWorkspaces(selected: readonly string[], imported: readonly string[], deps: WorkspaceImportDeps): Promise<WorkspaceImportFailure[]> {
  const failures: WorkspaceImportFailure[] = [];
  const completed = new Set(imported);
  // Project opens mutate shared app state and must run in order.
  for (const path of new Set(selected)) {
    if (completed.has(path)) continue;
    try {
      const snapshot = await deps.openProject(path);
      if (snapshot.errorMessage) throw new Error(snapshot.errorMessage);
      completed.add(path);
      deps.onImported(path);
    } catch (error) {
      failures.push({ path, message: error instanceof Error ? error.message : "Could not import this project." });
    }
  }
  return failures;
}
