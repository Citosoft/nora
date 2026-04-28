import type { RecentProject } from "@shared/appTypes";
import fs from "node:fs/promises";
import path from "node:path";
import { isNodeError } from "./nodeErrors";

const MAX_RECENT_PROJECTS = 8;

export class RecentProjectsStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<RecentProject[]> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      if (!raw.trim()) {
        return [];
      }

      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(this.isRecentProject);
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return [];
      }
      if (error instanceof SyntaxError) {
        return [];
      }
      throw error;
    }
  }

  async save(items: RecentProject[]): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(
      this.filePath,
      JSON.stringify(items.slice(0, MAX_RECENT_PROJECTS), null, 2),
      "utf8"
    );
  }

  async record(project: {
    name: string;
    rootPath: string;
    baseBranch: string;
  }): Promise<RecentProject[]> {
    const existing = await this.load();
    const next: RecentProject[] = [
      {
        name: project.name,
        rootPath: project.rootPath,
        baseBranch: project.baseBranch,
        lastOpenedAt: new Date().toISOString()
      },
      ...existing.filter((item) => item.rootPath !== project.rootPath)
    ];

    await this.save(next);
    return next.slice(0, MAX_RECENT_PROJECTS);
  }

  async remove(rootPath: string): Promise<RecentProject[]> {
    const existing = await this.load();
    const next = existing.filter((item) => item.rootPath !== rootPath);
    await this.save(next);
    return next;
  }

  private isRecentProject(value: unknown): value is RecentProject {
    if (!value || typeof value !== "object") {
      return false;
    }

    const candidate = value as Partial<RecentProject>;
    return (
      typeof candidate.name === "string" &&
      typeof candidate.rootPath === "string" &&
      typeof candidate.baseBranch === "string" &&
      typeof candidate.lastOpenedAt === "string"
    );
  }
}
