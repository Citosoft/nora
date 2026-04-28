import fs from "node:fs/promises";
import path from "node:path";
import type { PersistedWorkspaceState } from "./types/internal.types";

export class WorkspaceStateStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<PersistedWorkspaceState | null> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      return JSON.parse(raw) as PersistedWorkspaceState;
    } catch {
      return null;
    }
  }

  async save(state: PersistedWorkspaceState): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(state, null, 2), "utf8");
  }

  async clear(): Promise<void> {
    try {
      await fs.unlink(this.filePath);
    } catch {
      // ignore missing file
    }
  }
}
