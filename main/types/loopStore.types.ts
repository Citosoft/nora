import type { LoopDefinition, LoopRun } from "@shared/appTypes";

export interface LoopStore {
  listDefinitions: (projectId: string) => Promise<LoopDefinition[]>;
  saveDefinition: (definition: LoopDefinition) => Promise<void>;
  deleteDefinition: (projectId: string, definitionId: string) => Promise<void>;
  listRuns: (projectId: string) => Promise<LoopRun[]>;
  getRun: (projectId: string, runId: string) => Promise<LoopRun | null>;
  saveRun: (run: LoopRun) => Promise<void>;
  deleteRun: (projectId: string, runId: string) => Promise<void>;
}
