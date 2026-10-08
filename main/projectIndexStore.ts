import type { ProjectSummary } from "@shared/appTypes";
import fs from "node:fs/promises";
import path from "node:path";
import { parseStoredProjectSummaries } from "./helpers/storedProjectSummary";

export class ProjectIndexStore {
  constructor(
    private readonly indexPath: string,
    private readonly getProjectFilePath: (projectId: string) => string
  ) {}

  async load(): Promise<ProjectSummary[]> {
    try {
      const raw = await fs.readFile(this.indexPath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      return parseStoredProjectSummaries(parsed);
    } catch {
      return [];
    }
  }

  async saveAll(items: ProjectSummary[]): Promise<void> {
    await fs.mkdir(path.dirname(this.indexPath), { recursive: true });
    await fs.writeFile(this.indexPath, JSON.stringify(items, null, 2), "utf8");
  }

  async save(project: ProjectSummary): Promise<ProjectSummary[]> {
    const existing = await this.load();
    const existingIndex = existing.findIndex((item) => item.id === project.id);
    const next =
      existingIndex === -1
        ? [...existing, project]
        : existing.map((item, index) => (index === existingIndex ? project : item));
    await this.saveAll(next);
    const projectFile = this.getProjectFilePath(project.id);
    await fs.mkdir(path.dirname(projectFile), { recursive: true });
    await fs.writeFile(projectFile, JSON.stringify(project, null, 2), "utf8");
    return next;
  }

  async remove(projectId: string): Promise<ProjectSummary[]> {
    const existing = await this.load();
    const next = existing.filter((item) => item.id !== projectId);
    await this.saveAll(next);
    const projectFile = this.getProjectFilePath(projectId);
    await fs.rm(path.dirname(projectFile), {
      recursive: true,
      force: true
    }).catch(() => {});
    return next;
  }
}
