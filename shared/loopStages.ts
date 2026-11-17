import type { LoopIteration, LoopRunRole, LoopRoleDefinition } from "./types/loop.types";

/** Only these runtimes expose an enforced inspection-only workflow mode. */
export function canReviewLoop(toolId: string): boolean { return toolId === "codex" || toolId === "claude"; }
export function assertLoopReviewer(toolId: string, name: string): void {
  if (!canReviewLoop(toolId)) throw new Error(`${name} cannot review with ${toolId}: an enforced read-only mode is required. Choose Claude or Codex.`);
}

/** Rework invalidates the destination and everything after it; earlier accepted results remain valid. */
export function loopReworkResults(roles: readonly LoopRunRole[], previous: LoopIteration | undefined): LoopIteration["results"] {
  const rejected = previous?.results.find((result) => result.outcome === "continue" || result.outcome === "changes_requested");
  if (!rejected || !previous) return [];
  const failed = roles.find((role) => role.roleId === rejected.roleId);
  const target = failed?.reworkStageId ?? roles[0]?.roleId;
  const index = roles.findIndex((role) => role.roleId === target);
  if (index < 0) throw new Error("The workflow's rework destination is missing.");
  const retained = new Set(roles.slice(0, index).map((role) => role.roleId));
  return previous.results.filter((result) => retained.has(result.roleId));
}

export function loopReworkError(stages: readonly LoopRoleDefinition[]): string | null {
  for (const [index, stage] of stages.entries()) {
    if (!stage.reworkStageId) continue;
    const target = stages.findIndex((entry) => entry.id === stage.reworkStageId);
    if (target < 0 || target > index || stages[target].kind !== "writer") {
      return `${stage.name}'s rework destination must be an earlier work stage (or itself for a work stage).`;
    }
  }
  return null;
}
