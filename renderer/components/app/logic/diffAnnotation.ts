import { getInlineCommentKey, type ParsedDiffLine } from "@/components/app/logic/forgePanelDiff";
import type { DiffAnnotation } from "@shared/appTypes";

export function buildDiffAnnotationKey(path: string, oldLine: number | null, newLine: number | null): string {
  return getInlineCommentKey(path, oldLine, newLine);
}

export function canAnnotateDiffLine(line: ParsedDiffLine): boolean {
  return line.oldLine !== null || line.newLine !== null;
}

export function sortDiffAnnotations(annotations: DiffAnnotation[]): DiffAnnotation[] {
  return [...annotations].sort((left, right) => {
    const pathCompare = left.target.path.localeCompare(right.target.path);
    if (pathCompare !== 0) {
      return pathCompare;
    }

    const leftLine = left.target.newLine ?? left.target.oldLine ?? 0;
    const rightLine = right.target.newLine ?? right.target.oldLine ?? 0;
    if (leftLine !== rightLine) {
      return leftLine - rightLine;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

export function groupDiffAnnotationsByPath(annotations: DiffAnnotation[]): Map<string, DiffAnnotation[]> {
  const grouped = new Map<string, DiffAnnotation[]>();
  sortDiffAnnotations(annotations).forEach((annotation) => {
    grouped.set(annotation.target.path, [...(grouped.get(annotation.target.path) ?? []), annotation]);
  });
  return grouped;
}

export function createDiffAnnotationId(): string {
  return `diff-annotation-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatLineLabel(oldLine: number | null, newLine: number | null): string {
  if (oldLine !== null && newLine !== null) {
    return `Line ${oldLine} → ${newLine}`;
  }
  if (newLine !== null) {
    return `Line ${newLine} (added)`;
  }
  if (oldLine !== null) {
    return `Line ${oldLine} (removed)`;
  }
  return "Unknown line";
}

export function buildDiffReviewPrompt(annotations: DiffAnnotation[]): string {
  const sorted = sortDiffAnnotations(annotations);
  if (!sorted.length) {
    return "";
  }

  const sections: string[] = [
    "Please address the following inline review comments on my local changes:",
    ""
  ];

  let currentPath: string | null = null;
  sorted.forEach((annotation, index) => {
    if (annotation.target.path !== currentPath) {
      currentPath = annotation.target.path;
      sections.push(`## ${currentPath}`);
      sections.push("");
    }

    sections.push(`### ${formatLineLabel(annotation.target.oldLine, annotation.target.newLine)}`);
    sections.push("```diff");
    const lineText = annotation.target.lineText.trim() || "(empty line)";
    sections.push(
      lineText.startsWith(" ") || lineText.startsWith("+") || lineText.startsWith("-") ? lineText : ` ${lineText}`
    );
    sections.push("```");
    sections.push("");
    sections.push(annotation.body.trim());

    if (index < sorted.length - 1) {
      sections.push("");
      sections.push("---");
      sections.push("");
    }
  });

  return sections.join("\n").trim();
}
