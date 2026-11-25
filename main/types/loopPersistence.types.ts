import type { LoopRun } from "@shared/appTypes";
import type { LoopStore } from "./loopStore.types";
export interface LoopPersistenceDeps {
  store: LoopStore;
  nowIso(): string;
  notifyRunChanged(run: LoopRun): void;
}

export interface PendingLoopOutput {
  snapshot: Pick<LoopRun, "outputLog" | "outputEvents">;
  written: Promise<void>;
}
