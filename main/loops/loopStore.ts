import type { LoopDefinition, LoopRun } from "@shared/appTypes";
import fs from "node:fs/promises";
import path from "node:path";
import type { LoopStore } from "@main/types/loopStore.types";

type LoopStoreDeps = {
  resolveStatePath: (projectId: string, relativePath: string) => Promise<string>;
};

async function readJsonFile(filePath: string): Promise<unknown> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as unknown;
  } catch {
    return null;
  }
}

async function writeJsonAtomic(filePath: string, value: object): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(temporaryPath, filePath);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeLoadedRun(value: LoopRun): LoopRun {
  return {
    ...value,
    specPath: value.specPath ?? null,
    taskPath: value.taskPath ?? null,
    handoffPath: value.handoffPath ?? null,
    worktreePath: value.worktreePath ?? null,
    outputLog: value.outputLog ?? "",
    outputEvents: value.outputEvents ?? [],
    limits: value.limits ?? value.definition.limits,
    roles: value.roles.map((role) => ({
      roleId: role.roleId,
      kind: role.kind,
      name: role.name,
      toolId: role.toolId,
      instructions: role.instructions
    })),
    iterations: value.iterations.map((iteration) => ({
      ...iteration,
      writerResult: iteration.writerResult
        ? {
            roleId: iteration.writerResult.roleId,
            outcome: iteration.writerResult.outcome,
            summary: iteration.writerResult.summary,
            completedAt: iteration.writerResult.completedAt
          }
        : null,
      reviewerResults: iteration.reviewerResults.map((result) => ({
        roleId: result.roleId,
        outcome: result.outcome,
        summary: result.summary,
        completedAt: result.completedAt
      }))
    }))
  };
}

function isLoopDefinition(value: unknown): value is LoopDefinition {
  return isRecord(value) && typeof value.id === "string" && typeof value.projectId === "string" &&
    typeof value.name === "string" && isRecord(value.writer) && Array.isArray(value.reviewers) && isRecord(value.limits);
}

function isLoopRun(value: unknown): value is LoopRun {
  return isRecord(value) && typeof value.id === "string" && typeof value.projectId === "string" &&
    typeof value.status === "string" && isLoopDefinition(value.definition) && Array.isArray(value.roles) &&
    Array.isArray(value.iterations) && Array.isArray(value.events);
}

export function createLoopStore(deps: LoopStoreDeps): LoopStore {
  const definitionsDir = (projectId: string) => deps.resolveStatePath(projectId, ".nora/loops/definitions");
  const runsDir = (projectId: string) => deps.resolveStatePath(projectId, ".nora/loops/runs");

  async function listFiles<T>(directory: string, guard: (value: unknown) => value is T): Promise<T[]> {
    try {
      const names = (await fs.readdir(directory)).filter((name) => name.endsWith(".json"));
      const values = await Promise.all(names.map((name) => readJsonFile(path.join(directory, name))));
      return values.filter(guard);
    } catch {
      return [];
    }
  }

  return {
    async listDefinitions(projectId) {
      return (await listFiles(await definitionsDir(projectId), isLoopDefinition))
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    },
    async saveDefinition(definition) {
      await writeJsonAtomic(path.join(await definitionsDir(definition.projectId), `${definition.id}.json`), definition);
    },
    async deleteDefinition(projectId, definitionId) {
      await fs.rm(path.join(await definitionsDir(projectId), `${definitionId}.json`), { force: true });
    },
    async listRuns(projectId) {
      return (await listFiles(await runsDir(projectId), isLoopRun))
        .map(normalizeLoadedRun)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    },
    async getRun(projectId, runId) {
      const value = await readJsonFile(path.join(await runsDir(projectId), `${runId}.json`));
      if (!isLoopRun(value)) {
        return null;
      }
      return normalizeLoadedRun(value);
    },
    async saveRun(run) {
      await writeJsonAtomic(path.join(await runsDir(run.projectId), `${run.id}.json`), run);
    },
    async deleteRun(projectId, runId) {
      await fs.rm(path.join(await runsDir(projectId), `${runId}.json`), { force: true });
    }
  };
}
