import type { ProjectSummary } from "@shared/appTypes";
import { parseProjectVersionControl } from "@shared/projectVersionControl";

/** Validates a persisted project and backfills fields added after it was written. */
export function parseStoredProjectSummary(value: unknown): ProjectSummary | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<ProjectSummary>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.name !== "string" ||
    typeof candidate.rootPath !== "string" ||
    typeof candidate.gitCommonDir !== "string" ||
    typeof candidate.baseBranch !== "string" ||
    typeof candidate.platform !== "string" ||
    typeof candidate.createdAt !== "string" ||
    typeof candidate.updatedAt !== "string" ||
    typeof candidate.lastOpenedAt !== "string"
  ) {
    return null;
  }

  return {
    ...(candidate as ProjectSummary),
    versionControl: parseProjectVersionControl(candidate.versionControl)
  };
}

export function parseStoredProjectSummaries(values: unknown): ProjectSummary[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.flatMap((value) => {
    const project = parseStoredProjectSummary(value);
    return project ? [project] : [];
  });
}
