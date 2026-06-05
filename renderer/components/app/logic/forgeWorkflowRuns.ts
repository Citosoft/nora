import type { ForgeWorkflowRunSummary } from "@shared/appTypes";

export function parseForgeWorkflowRunNumber(run: ForgeWorkflowRunSummary): number | null {
  const runId = Number.parseInt(run.id.replace(/^(github-workflow-run|gitlab-pipeline)-/, ""), 10);
  return Number.isInteger(runId) && runId > 0 ? runId : null;
}

