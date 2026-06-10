import type { LoopLimits } from "./types/loop.types";

export interface LoopLimitsDraft {
  maxIterations: number;
  maxDurationMinutes: number;
  roleTimeoutMinutes: number;
}

export function buildLoopLimitsFromDraft(draft: LoopLimitsDraft): LoopLimits {
  return {
    maxIterations: draft.maxIterations,
    maxDurationMs: draft.maxDurationMinutes * 60_000,
    roleTimeoutMs: draft.roleTimeoutMinutes * 60_000
  };
}

export function loopLimitsToDraft(limits: LoopLimits): LoopLimitsDraft {
  return {
    maxIterations: limits.maxIterations,
    maxDurationMinutes: Math.round(limits.maxDurationMs / 60_000),
    roleTimeoutMinutes: Math.round(limits.roleTimeoutMs / 60_000)
  };
}

function isPositiveIntegerInRange(value: number, minimum: number, maximum: number): boolean {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

export function isLoopLimitsDraftValid(draft: LoopLimitsDraft): boolean {
  return isPositiveIntegerInRange(draft.maxIterations, 1, 100)
    && isPositiveIntegerInRange(draft.maxDurationMinutes, 5, 1440)
    && isPositiveIntegerInRange(draft.roleTimeoutMinutes, 1, 240);
}

export function validateLoopLimits(limits: LoopLimits): LoopLimits {
  if (!Number.isInteger(limits.maxIterations) || limits.maxIterations < 1 || limits.maxIterations > 100) {
    throw new Error("Workflow iterations must be between 1 and 100.");
  }
  if (!Number.isInteger(limits.maxDurationMs) || limits.maxDurationMs < 300_000 || limits.maxDurationMs > 86_400_000) {
    throw new Error("Workflow duration must be between 5 minutes and 24 hours.");
  }
  if (!Number.isInteger(limits.roleTimeoutMs) || limits.roleTimeoutMs < 60_000 || limits.roleTimeoutMs > 14_400_000) {
    throw new Error("Role timeout must be between 1 minute and 4 hours.");
  }
  return limits;
}

export function resolveLoopRunLimits(definitionLimits: LoopLimits, override?: LoopLimits | null): LoopLimits {
  return validateLoopLimits(override ?? definitionLimits);
}
