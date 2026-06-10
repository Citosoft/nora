import type { LoopDefinition, LoopRoleDefinition, SaveLoopDefinitionPayload } from "@shared/appTypes";
import { validateLoopLimits } from "@shared/loopLimits";

const MAX_REVIEWERS = 5;
const MAX_TEXT_LENGTH = 20_000;

function requiredText(value: string | null | undefined, name: string, maxLength = MAX_TEXT_LENGTH): string {
  if (value == null) {
    throw new Error(`${name} is required.`);
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${name} is required.`);
  }
  if (normalized.length > maxLength) {
    throw new Error(`${name} is too long.`);
  }
  return normalized;
}

function validateRole(role: LoopRoleDefinition, expectedKind: LoopRoleDefinition["kind"]): LoopRoleDefinition {
  if (role.kind !== expectedKind) {
    throw new Error(`Workflow ${expectedKind} role has an invalid kind.`);
  }
  return {
    id: requiredText(role.id, "role id", 200),
    kind: expectedKind,
    name: requiredText(role.name, "role name", 200),
    toolId: requiredText(role.toolId, "role tool", 200),
    instructions: requiredText(role.instructions, "role instructions")
  };
}

export function normalizeLoopDefinition(
  payload: SaveLoopDefinitionPayload,
  nowIso: string
): LoopDefinition {
  if (!payload?.definition) {
    throw new Error("Workflow payload is invalid.");
  }
  if (!payload.definition.writer) {
    throw new Error("Workflow writer is required.");
  }
  if (!payload.definition.limits) {
    throw new Error("Workflow limits are required.");
  }
  const reviewers = payload.definition.reviewers ?? [];
  if (reviewers.length > MAX_REVIEWERS) {
    throw new Error(`A workflow can have at most ${MAX_REVIEWERS} reviewers.`);
  }
  const writer = validateRole(payload.definition.writer, "writer");
  const normalizedReviewers = reviewers.map((role) => validateRole(role, "reviewer"));
  const roleIds = [writer.id, ...normalizedReviewers.map((role) => role.id)];
  if (new Set(roleIds).size !== roleIds.length) {
    throw new Error("Workflow role ids must be unique.");
  }
  return {
    id: requiredText(payload.definition.id, "workflow id", 200),
    projectId: requiredText(payload.projectId, "project id", 300),
    name: requiredText(payload.definition.name, "workflow name", 200),
    writer,
    reviewers: normalizedReviewers,
    limits: validateLoopLimits(payload.definition.limits),
    createdAt: payload.definition.createdAt || nowIso,
    updatedAt: nowIso
  };
}
