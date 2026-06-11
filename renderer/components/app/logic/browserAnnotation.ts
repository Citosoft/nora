import type { BrowserAnnotation, BrowserElementTarget } from "@shared/appTypes";

export const BROWSER_INSPECT_MESSAGE_PREFIX = "__NORA_INSPECT_TARGET__:";

export function buildBrowserAnnotationKey(target: BrowserElementTarget): string {
  return `${target.pageUrl}::${target.selector}`;
}

export function createBrowserAnnotationId(): string {
  return `browser-annotation-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function sortBrowserAnnotations(annotations: BrowserAnnotation[]): BrowserAnnotation[] {
  return [...annotations].sort((left, right) => {
    const urlCompare = left.target.pageUrl.localeCompare(right.target.pageUrl);
    if (urlCompare !== 0) {
      return urlCompare;
    }

    const selectorCompare = left.target.selector.localeCompare(right.target.selector);
    if (selectorCompare !== 0) {
      return selectorCompare;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

export function groupBrowserAnnotationsByUrl(annotations: BrowserAnnotation[]): Map<string, BrowserAnnotation[]> {
  const grouped = new Map<string, BrowserAnnotation[]>();
  sortBrowserAnnotations(annotations).forEach((annotation) => {
    grouped.set(annotation.target.pageUrl, [...(grouped.get(annotation.target.pageUrl) ?? []), annotation]);
  });
  return grouped;
}

function formatElementLabel(target: BrowserElementTarget): string {
  const tag = target.tagName.toLowerCase();
  const id = target.attributes.id?.trim();
  if (id) {
    return `${tag}#${id}`;
  }

  const testId = target.attributes["data-testid"]?.trim();
  if (testId) {
    return `${tag}[data-testid="${testId}"]`;
  }

  const className = target.attributes.class?.trim().split(/\s+/).filter(Boolean)[0];
  if (className) {
    return `${tag}.${className}`;
  }

  return tag;
}

export function buildBrowserReviewPrompt(annotations: BrowserAnnotation[]): string {
  const sorted = sortBrowserAnnotations(annotations);
  if (!sorted.length) {
    return "";
  }

  const sections: string[] = [
    "Please address the following review comments from pages I inspected in the browser:",
    ""
  ];

  let currentUrl: string | null = null;
  sorted.forEach((annotation, index) => {
    if (annotation.target.pageUrl !== currentUrl) {
      currentUrl = annotation.target.pageUrl;
      sections.push(`## ${currentUrl}`);
      if (annotation.target.pageTitle.trim()) {
        sections.push(`Page title: ${annotation.target.pageTitle.trim()}`);
      }
      sections.push("");
    }

    sections.push(`### ${formatElementLabel(annotation.target)}`);
    sections.push(`Selector: \`${annotation.target.selector}\``);
    if (annotation.target.textPreview.trim()) {
      sections.push(`Text: ${annotation.target.textPreview.trim()}`);
    }
    sections.push("```html");
    sections.push(annotation.target.htmlSnippet.trim() || `<${annotation.target.tagName.toLowerCase()} />`);
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

export function getBrowserAnnotationsForUrl(annotations: BrowserAnnotation[], pageUrl: string): BrowserAnnotation[] {
  return annotations.filter((annotation) => annotation.target.pageUrl === pageUrl);
}
