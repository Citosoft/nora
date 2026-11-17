import type { LoopRoleDefinition } from "@shared/appTypes";

export function newWorkflowStage(toolId: string, number: number): LoopRoleDefinition {
  return { id: `stage-${crypto.randomUUID()}`, kind: "writer", name: number === 1 ? "Implementation" : `Stage ${number}`,
    toolId, model: null, instructions: number === 1 ? "Implement the assigned work and verify the result." : "Complete this stage using the results of earlier stages." };
}

export function moveWorkflowStage(stages: readonly LoopRoleDefinition[], index: number, direction: -1 | 1): LoopRoleDefinition[] {
  const result = [...stages];
  const target = index + direction;
  if (index < 0 || index >= result.length || target < 0 || target >= result.length) return result;
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}
