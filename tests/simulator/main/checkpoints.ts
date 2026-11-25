import type { TurnCheckpoints } from "@main/types/execution/checkpoints.types";
import { simulatedFileChanges } from "../fileChanges";

/** Scripted review fixtures exercise the real review pipeline without reading or modifying files. */
export function createSimulatorCheckpoints(): TurnCheckpoints {
  return {
    async capture() { return { status: "ready", snapshot: { capturedAt: new Date().toISOString(), files: [] } }; },
    async compare(_workspace, baseline, final) {
      return { status: "ready", scope: "turn", attribution: "observed", baselineAt: baseline.capturedAt, capturedAt: final.capturedAt,
        changes: structuredClone(simulatedFileChanges) };
    },
    async read() { return null; },
    // Scripted undo reports every file restored without touching disk.
    async restore(_workspace, targets, mode) { return { status: "undone", mode, restored: targets.map((target) => target.path), skipped: [] }; }
  };
}
