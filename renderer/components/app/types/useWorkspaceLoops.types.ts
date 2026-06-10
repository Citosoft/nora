import type { LoopDefinition, LoopRun } from "@shared/appTypes";

export interface UseWorkspaceLoopsResult {
  definitions: LoopDefinition[];
  runs: LoopRun[];
  isLoading: boolean;
  errorMessage: string | null;
  refresh: () => Promise<void>;
  upsertDefinition: (definition: LoopDefinition) => void;
  removeDefinition: (definitionId: string) => Promise<void>;
  upsertRun: (run: LoopRun) => void;
  removeRun: (runId: string) => Promise<boolean>;
}
