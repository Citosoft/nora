import type { OrcaDocumentPart } from "@main/types/app-import/orca.types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Rebuilds a split profile-state domain from its parts. Orca stores large map domains one entry
 * per row, each at a JSON key path (orca src/main/persistence/profile-state/document-parts/);
 * placing every payload at its path yields the same value as Orca's text reassembly.
 */
export function assembleOrcaDomain(parts: readonly OrcaDocumentPart[]): unknown {
  let root: unknown = {};
  for (const { path, payload } of parts) {
    const value: unknown = JSON.parse(payload);
    if (path.length === 0) {
      root = value;
      continue;
    }
    const container: Record<string, unknown> = isRecord(root) ? root : {};
    root = container;
    let parent = container;
    for (const segment of path.slice(0, -1)) {
      const child = parent[segment];
      if (isRecord(child)) {
        parent = child;
      } else {
        const created: Record<string, unknown> = {};
        parent[segment] = created;
        parent = created;
      }
    }
    parent[path[path.length - 1]] = value;
  }
  return root;
}

export function parseOrcaPartKey(key: string): string[] | null {
  try {
    const path: unknown = JSON.parse(key);
    return Array.isArray(path) && path.every((segment): segment is string => typeof segment === "string") ? path : null;
  } catch {
    return null;
  }
}
