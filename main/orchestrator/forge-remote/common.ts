import type { ForgeCreatePullRequestPayload, ForgeInlineCommentTarget } from "@shared/appTypes";
import type { NormalizedInlineCommentTarget } from "../../types/forgeRemote.types";

export function validateCommentBody(body: string): string {
  const trimmedBody = body.trim();
  if (!trimmedBody) {
    throw new Error("Comment body cannot be empty.");
  }
  return trimmedBody;
}

export function normalizeInlineCommentTarget(target: ForgeInlineCommentTarget): NormalizedInlineCommentTarget {
  const path = target.path.trim();
  if (!path) {
    throw new Error("Inline comment path cannot be empty.");
  }

  const hasOldLine = typeof target.oldLine === "number" && Number.isInteger(target.oldLine) && target.oldLine > 0;
  const hasNewLine = typeof target.newLine === "number" && Number.isInteger(target.newLine) && target.newLine > 0;
  if (!hasOldLine && !hasNewLine) {
    throw new Error("Inline comment requires a valid line number.");
  }

  return {
    path,
    oldLine: hasOldLine ? target.oldLine ?? null : null,
    newLine: hasNewLine ? target.newLine ?? null : null,
    hasOldLine,
    hasNewLine
  };
}

export function validatePullRequestInput(sourceBranch: string, payload: ForgeCreatePullRequestPayload): void {
  if (!sourceBranch || sourceBranch === "HEAD") {
    throw new Error("Choose a source branch.");
  }
  if (!payload.baseBranch.trim()) {
    throw new Error("Choose a base branch.");
  }
  if (sourceBranch === payload.baseBranch.trim()) {
    throw new Error("The source branch and base branch cannot be the same.");
  }
  if (!payload.title.trim()) {
    throw new Error("Enter a pull request title.");
  }
}
