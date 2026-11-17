import type { TurnCheckpoints } from "@main/types/execution/checkpoints.types";
import { simulatedFileChanges } from "../fileChanges";

/** Scripted review fixtures exercise the real review pipeline without reading or modifying files. */
export function createSimulatorCheckpoints(): TurnCheckpoints {
  return {
    async capture() { return { status: "ready", snapshot: { capturedAt: new Date().toISOString(), files: [] } }; },
    async compare(baseline, final) {
      return { status: "ready", scope: "turn", attribution: "observed", baselineAt: baseline.capturedAt, capturedAt: final.capturedAt,
        changes: structuredClone(simulatedFileChanges) };
    }
  };
}
