import type { LoopOutputEvent, LoopOutputEventPayload } from "@shared/appTypes";
import type { LoopOutputNormalizerContext } from "@main/types/loopOutputNormalizer.types";

export function createLoopOutputEvent(
  context: LoopOutputNormalizerContext,
  event: LoopOutputEventPayload
): LoopOutputEvent {
  return {
    ...event,
    id: context.randomId(),
    turnId: context.turnId,
    roleId: context.roleId,
    roleName: context.roleName,
    roleKind: context.roleKind,
    toolId: context.toolId,
    iteration: context.iteration,
    createdAt: context.nowIso()
  } as LoopOutputEvent;
}
