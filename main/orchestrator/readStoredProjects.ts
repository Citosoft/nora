import type { ProjectSummary } from "@shared/appTypes";
import fs from "node:fs/promises";
import { getProjectFile, getProjectsDir } from "../noraPaths";

export const readStoredProjectFiles = async (): Promise<ProjectSummary[]> => {
  try {
    const entries = await fs.readdir(getProjectsDir(), { withFileTypes: true });
    const projects = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          try {
            const raw = await fs.readFile(getProjectFile(entry.name), "utf8");
            return JSON.parse(raw) as ProjectSummary;
          } catch {
            return null;
          }
        })
    );
    return projects.filter((project): project is ProjectSummary => project !== null);
  } catch {
    return [];
  }
};
