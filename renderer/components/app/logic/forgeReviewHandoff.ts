import { parseDiffLines } from "@/components/app/logic/forgePanelDiff";
import type { ForgeReviewCommentSelection } from "@/components/app/types/forgeReviewHandoff.types";
import type { ForgeWorkItemComment, ForgeWorkItemDetail } from "@shared/appTypes";

export const FORGE_REVIEW_HANDOFF_DIRECTORY = ".nora/agent_handoffs";

function isInlineReviewComment(comment: ForgeWorkItemComment): comment is ForgeWorkItemComment & { path: string } {
  return !!comment.path && (comment.oldLine !== null || comment.newLine !== null) && !!comment.body.trim();
}

function getReviewCommentLineText(detail: ForgeWorkItemDetail, comment: ForgeWorkItemComment & { path: string }): string {
  const change = detail.changes.find((entry) => entry.path === comment.path || entry.previousPath === comment.path);
  if (!change) {
    return "";
  }

  const matchingLine = parseDiffLines(change.diff).find((line) =>
    line.oldLine === comment.oldLine && line.newLine === comment.newLine
  );
  return matchingLine?.text ?? "";
}

function getLineSortValue(selection: ForgeReviewCommentSelection): number {
  return selection.newLine ?? selection.oldLine ?? 0;
}

function getFirstInlineCommentByThread(comments: ForgeWorkItemComment[]): Array<ForgeWorkItemComment & { path: string }> {
  const seenThreadIds = new Set<string>();
  const firstComments: Array<ForgeWorkItemComment & { path: string }> = [];

  comments.forEach((comment) => {
    if (!isInlineReviewComment(comment)) {
      return;
    }

    const threadId = comment.threadId?.trim() || null;
    if (threadId) {
      if (seenThreadIds.has(threadId)) {
        return;
      }
      seenThreadIds.add(threadId);
    }

    firstComments.push(comment);
  });

  return firstComments;
}

export function formatForgeReviewLineLabel(oldLine: number | null, newLine: number | null): string {
  if (oldLine !== null && newLine !== null) {
    return `Line ${oldLine} -> ${newLine}`;
  }
  if (newLine !== null) {
    return `Line ${newLine} (added)`;
  }
  if (oldLine !== null) {
    return `Line ${oldLine} (removed)`;
  }
  return "Unknown line";
}

export function getForgeReviewCommentSelections(detail: ForgeWorkItemDetail | null): ForgeReviewCommentSelection[] {
  if (!detail || detail.kind !== "pull_request") {
    return [];
  }

  return getFirstInlineCommentByThread(detail.comments)
    .map((comment) => ({
      commentId: comment.id,
      path: comment.path,
      oldLine: comment.oldLine,
      newLine: comment.newLine,
      lineText: getReviewCommentLineText(detail, comment),
      author: comment.author,
      body: comment.body.trim(),
      createdAt: comment.createdAt
    }))
    .sort((left, right) => {
      const pathCompare = left.path.localeCompare(right.path);
      if (pathCompare !== 0) {
        return pathCompare;
      }

      const lineCompare = getLineSortValue(left) - getLineSortValue(right);
      if (lineCompare !== 0) {
        return lineCompare;
      }

      return left.createdAt.localeCompare(right.createdAt);
    });
}

export function buildForgeReviewInstruction(
  detail: ForgeWorkItemDetail,
  selections: ForgeReviewCommentSelection[]
): string {
  if (!selections.length) {
    return "";
  }

  const sections: string[] = [
    `Address selected review comments on merge request #${detail.item.number}: ${detail.item.title}`,
    "",
    `Source: ${detail.item.webUrl}`,
    detail.item.sourceBranch && detail.item.targetBranch
      ? `Branches: ${detail.item.sourceBranch} -> ${detail.item.targetBranch}`
      : "",
    "",
    "Implement the requested changes for each selected review comment, inspect the surrounding code before editing, and validate the result before reporting back.",
    ""
  ].filter(Boolean);

  let currentPath: string | null = null;
  selections.forEach((selection, index) => {
    if (selection.path !== currentPath) {
      currentPath = selection.path;
      sections.push(`## ${selection.path}`);
      sections.push("");
    }

    sections.push(`### ${formatForgeReviewLineLabel(selection.oldLine, selection.newLine)}`);
    sections.push("```diff");
    const lineText = selection.lineText.trim() || "(line context unavailable)";
    sections.push(
      lineText.startsWith(" ") || lineText.startsWith("+") || lineText.startsWith("-") ? lineText : ` ${lineText}`
    );
    sections.push("```");
    sections.push("");
    sections.push(`Reviewer: ${selection.author || "Unknown"}`);
    sections.push(selection.body);

    if (index < selections.length - 1) {
      sections.push("");
      sections.push("---");
      sections.push("");
    }
  });

  return sections.join("\n").trim();
}

export function createForgeReviewHandoffRelativePath(detail: ForgeWorkItemDetail): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${FORGE_REVIEW_HANDOFF_DIRECTORY}/forge-review-mr-${detail.item.number}-${timestamp}.md`;
}

export function resolveForgeReviewHandoffDisplayPath(workspaceRoot: string, relativePath: string): string {
  const trimmedRoot = workspaceRoot.replace(/[\\/]+$/, "");
  if (!trimmedRoot) {
    return relativePath;
  }
  const separator = trimmedRoot.includes("\\") ? "\\" : "/";
  return `${trimmedRoot}${separator}${relativePath.replace(/[\\/]/g, separator)}`;
}

export function buildForgeReviewFileInstruction(options: {
  detail: ForgeWorkItemDetail;
  handoffPath: string;
  selectionCount: number;
}): string {
  return [
    `Address ${options.selectionCount} selected review comment${options.selectionCount === 1 ? "" : "s"} on merge request #${options.detail.item.number}: ${options.detail.item.title}`,
    "",
    `The full review handoff is in this file:`,
    options.handoffPath,
    "",
    "Read that file, implement the requested changes, inspect the surrounding code before editing, and validate the result before reporting back."
  ].join("\n");
}
