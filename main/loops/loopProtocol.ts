import type { LoopDefinition, LoopIteration, LoopRoleOutcome, LoopRunRole } from "@shared/appTypes";
import { buildLoopRunGoalPromptSection, type LoopRunGoal } from "@shared/loopRunGoal";
import type { ParsedLoopResult } from "@main/types/loopRunner.types";

const RESULT_PATTERN = /<nora-loop-result\s+token="([^"]+)"\s+outcome="(continue|complete|approve|changes_requested)">([\s\S]*?)<\/nora-loop-result>/g;
const MAX_SUMMARY_LENGTH = 20_000;

function stripAnsi(value: string): string {
  return value.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "");
}

export function parseLoopResult(output: string, token: string): ParsedLoopResult | null {
  const normalized = stripAnsi(output);
  let match: RegExpExecArray | null;
  let result: ParsedLoopResult | null = null;
  RESULT_PATTERN.lastIndex = 0;
  while ((match = RESULT_PATTERN.exec(normalized))) {
    if (match[1] !== token) {
      continue;
    }
    result = {
      outcome: match[2] as LoopRoleOutcome,
      summary: match[3].trim().slice(0, MAX_SUMMARY_LENGTH)
    };
  }
  return result;
}

function renderProtocol(role: LoopRunRole, token: string): string {
  const outcomes = role.kind === "writer" ? "continue|complete" : "approve|changes_requested";
  return [
    "When this turn is finished, emit exactly one result block using this token:",
    `<nora-loop-result token="${token}" outcome="${outcomes}">`,
    "Concise summary of work or review feedback",
    "</nora-loop-result>",
    "Do not reuse markers from earlier turns."
  ].join("\n");
}

function aggregateFeedback(iteration: LoopIteration | undefined): string {
  if (!iteration?.reviewerResults.length) {
    return "No reviewer feedback is available from the previous iteration.";
  }
  return iteration.reviewerResults
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
    `You are the writer role in the workflow "${definition.name}".`,
    buildLoopRunGoalPromptSection(goal),
    `Role instructions:\n${role.instructions}`,
    iteration ? `Reviewer feedback from the previous iteration:\n${aggregateFeedback(iteration)}` : "This is the first iteration.",
    "Inspect the current repository state, make the next coherent implementation advance, and run appropriate verification.",
    "Return complete only when the run goal is fully satisfied; otherwise return continue.",
    renderProtocol(role, token)
  ].join("\n\n");
}

export function buildReviewerPrompt(
  definition: LoopDefinition,
  role: LoopRunRole,
  goal: LoopRunGoal,
  writerSummary: string,
  token: string
): string {
  return [
    `You are a read-only reviewer in the workflow "${definition.name}".`,
    buildLoopRunGoalPromptSection(goal),
    `Role instructions:\n${role.instructions}`,
    `Writer summary:\n${writerSummary || "No summary provided."}`,
    "Inspect the shared worktree and verify the implementation. Do not edit files.",
    "Return approve only when no actionable issue remains; otherwise return changes_requested with concrete feedback.",
    renderProtocol(role, token)
  ].join("\n\n");
}
