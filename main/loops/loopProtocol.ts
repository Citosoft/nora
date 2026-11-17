import type { LoopDefinition, LoopIteration, LoopRunRole } from "@shared/appTypes";
import { buildLoopRunGoalPromptSection, type LoopRunGoal } from "@shared/loopRunGoal";

function describeWorkflow(definition: LoopDefinition, intro: string): string {
  return definition.description ? `${intro}\nWorkflow purpose: ${definition.description}` : intro;
}

function renderProtocol(role: LoopRunRole, token: string): string {
  const outcomes = role.kind === "writer" ? "continue|complete" : "approve|changes_requested";
  return [
    "When this stage is finished, call the Nora MCP tool report_workflow_stage exactly once with:",
    `attempt_id: "${token}"`,
    `outcome: one of ${outcomes}`,
    "summary: a concise description of your work or actionable review feedback.",
    "After the tool acknowledges the report, finish this turn. Do not report a different attempt or write result tags in your response."
  ].join("\n");
}

function aggregateFeedback(iteration: LoopIteration | undefined): string {
  if (!iteration?.results.length) {
    return "No stage feedback is available from the previous iteration.";
  }
  return iteration.results
    .map((result) => `- ${result.outcome}: ${result.summary || "No summary provided."}`)
    .join("\n");
}

export function buildWriterPrompt(
  definition: LoopDefinition,
  role: LoopRunRole,
  goal: LoopRunGoal,
  iteration: LoopIteration | undefined,
  token: string
): string {
  return [
    describeWorkflow(definition, `You are a work stage in the workflow "${definition.name}".`),
    buildLoopRunGoalPromptSection(goal),
    `Stage "${role.name}" instructions:\n${role.instructions}`,
    iteration ? `Stage results from the previous iteration:\n${aggregateFeedback(iteration)}` : "This is the first iteration.",
    "Inspect the current repository state, make the next coherent implementation advance, and run appropriate verification.",
    "Return complete when your assigned stage is fully satisfied; otherwise return continue.",
    renderProtocol(role, token)
  ].join("\n\n");
}

export function buildReviewerPrompt(
  definition: LoopDefinition,
  role: LoopRunRole,
  goal: LoopRunGoal,
  earlierResults: string,
  token: string
): string {
  return [
    describeWorkflow(definition, `You are a read-only reviewer in the workflow "${definition.name}".`),
    buildLoopRunGoalPromptSection(goal),
    `Stage "${role.name}" instructions:\n${role.instructions}`,
    `Earlier stage results:\n${earlierResults || "No summary provided."}`,
    "Inspect the shared worktree and verify the implementation. Do not edit files.",
    "Return approve only when no actionable issue remains; otherwise return changes_requested with concrete feedback.",
    renderProtocol(role, token)
  ].join("\n\n");
}

/** Every stage sees the ordered handoff, including feedback from earlier reviewers. */
export function buildStagePrompt(definition: LoopDefinition, role: LoopRunRole, goal: LoopRunGoal,
  previous: LoopIteration | undefined, current: LoopIteration, token: string): string {
  const handoff = current.results.map((result) => {
    const stage = definition.stages.find((entry) => entry.id === result.roleId);
    return `${stage?.name ?? result.roleId} (${result.outcome}): ${result.summary}`;
  }).join("\n\n");
  if (role.kind === "reviewer") {
    const prompt = buildReviewerPrompt(definition, role, goal, handoff, token);
    return previous ? `${prompt}\n\nPrevious pass results:\n${aggregateFeedback(previous)}` : prompt;
  }
  return `${buildWriterPrompt(definition, role, goal, previous, token)}\n\nEarlier stages in this pass:\n${handoff || "This is the first stage."}`;
}
