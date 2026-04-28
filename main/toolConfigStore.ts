import type { AgentToolConfig } from "@shared/appTypes";
import fs from "node:fs/promises";
import path from "node:path";
import { isNodeError } from "./nodeErrors";
import type { StoredToolConfigs } from "./types/internal.types";

export class ToolConfigStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<StoredToolConfigs> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return {};
      }

      const next: StoredToolConfigs = {};
      for (const [toolId, value] of Object.entries(parsed)) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          continue;
        }

        const candidate = value as Partial<AgentToolConfig>;
        if (!candidate.values || typeof candidate.values !== "object" || Array.isArray(candidate.values)) {
          continue;
        }

        next[toolId] = {
          values: Object.fromEntries(
            Object.entries(candidate.values).filter(
              (entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string"
            )
          ),
          updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : null
        };
      }

      return next;
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return {};
      }
      throw error;
    }
  }

  async saveAll(items: StoredToolConfigs): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(items, null, 2), "utf8");
  }

  async save(toolId: string, values: Record<string, string>): Promise<StoredToolConfigs> {
    const existing = await this.load();
    existing[toolId] = {
      values,
      updatedAt: new Date().toISOString()
    };
    await this.saveAll(existing);
    return existing;
  }
}
