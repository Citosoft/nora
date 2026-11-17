import type { ConversationRun } from "@shared/types/conversation/contracts.types";

export function isTurnTimerRunning(state: ConversationRun["state"]): boolean {
  return state !== "queued" && state !== "completed" && state !== "failed" && state !== "interrupted";
}

export function turnElapsedSeconds(run: ConversationRun, startedAt: string, now: number): number {
  const end = isTurnTimerRunning(run.state) ? now : Date.parse(run.updatedAt);
  return Math.max(0, Math.floor((end - Date.parse(startedAt)) / 1000));
}

export function formatTurnTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const remainder = seconds % 60;
  return hours ? `${hours}h ${minutes}m ${remainder}s` : minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}
