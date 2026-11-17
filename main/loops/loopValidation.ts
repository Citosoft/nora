import { assertLoopReviewer, loopReworkError } from "@shared/loopStages";
import type { LoopDefinition, LoopRoleDefinition, SaveLoopDefinitionPayload } from "@shared/appTypes";
import { validateLoopLimits } from "@shared/loopLimits";

const MAX_TEXT_LENGTH = 20_000;
const MAX_DESCRIPTION_LENGTH = 2_000;

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

function optionalText(value: string | null | undefined, name: string, maxLength: number): string {
  const normalized = (value ?? "").trim();
  if (normalized.length > maxLength) {
    throw new Error(`${name} is too long.`);
  }
  return normalized;
}

function validateRoleModel(role: LoopRoleDefinition): string | null {
  const model = optionalText(role.model, "role model", 512);
  if (!model) {
    return null;
  }
  return model;
}

function validateRole(role: LoopRoleDefinition): LoopRoleDefinition {
  if (role.kind !== "writer" && role.kind !== "reviewer") {
    throw new Error("Workflow stage has an invalid kind.");
  }
  const toolId = requiredText(role.toolId, "role tool", 200);
  if (role.kind === "reviewer") assertLoopReviewer(toolId, role.name);
  return {
    id: requiredText(role.id, "role id", 200),
    kind: role.kind,
    name: requiredText(role.name, "role name", 200),
    toolId,
    ...(role.instanceId ? { instanceId: requiredText(role.instanceId, "provider instance", 512) } : {}),
    model: validateRoleModel(role),
    instructions: requiredText(role.instructions, "role instructions"),
    ...(role.botId ? { botId: requiredText(role.botId, "bot id", 64) } : {}),
    ...(role.reworkStageId ? { reworkStageId: requiredText(role.reworkStageId, "rework stage", 200) } : {})
  };
}

export function normalizeLoopDefinition(
  payload: SaveLoopDefinitionPayload,
  nowIso: string
): LoopDefinition {
  if (!payload?.definition) {
    throw new Error("Workflow payload is invalid.");
  }
  if (!Array.isArray(payload.definition.stages) || !payload.definition.stages.length) {
    throw new Error("A workflow needs at least one stage.");
  }
  if (!payload.definition.limits) throw new Error("Workflow limits are required.");
  const stages = payload.definition.stages.map(validateRole);
  const roleIds = stages.map((stage) => stage.id);
  if (new Set(roleIds).size !== roleIds.length) {
    throw new Error("Workflow role ids must be unique.");
  }
  const reworkError = loopReworkError(stages);
  if (reworkError) throw new Error(reworkError);
  return {
    id: requiredText(payload.definition.id, "workflow id", 200),
    projectId: requiredText(payload.projectId, "project id", 300),
    name: requiredText(payload.definition.name, "workflow name", 200),
    description: optionalText(payload.definition.description, "workflow description", MAX_DESCRIPTION_LENGTH),
    stages,
    limits: validateLoopLimits(payload.definition.limits),
    createdAt: payload.definition.createdAt || nowIso,
    updatedAt: nowIso
  };
}
