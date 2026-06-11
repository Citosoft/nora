import type { StoredBrowserAnnotationsByScope } from "@/components/app/types/browserAnnotationPersistence.types";
import type { BrowserAnnotation, BrowserElementTarget } from "@shared/appTypes";

const BROWSER_ANNOTATIONS_STORAGE_KEY = "nora-browser-annotations";

export function buildBrowserAnnotationStorageKey(projectId: string, browserTabId: string): string {
  return `${projectId}::${browserTabId}`;
}

function normalizeAttributes(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string"
    )
  );
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function normalizeBrowserElementTarget(value: unknown): BrowserElementTarget | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<BrowserElementTarget>;
  if (typeof candidate.pageUrl !== "string" || candidate.pageUrl.trim().length === 0) {
    return null;
  }
  if (typeof candidate.selector !== "string" || candidate.selector.trim().length === 0) {
    return null;
  }
  if (typeof candidate.tagName !== "string" || candidate.tagName.trim().length === 0) {
    return null;
  }

  return {
    pageUrl: candidate.pageUrl,
    pageTitle: typeof candidate.pageTitle === "string" ? candidate.pageTitle : "",
    selector: candidate.selector,
    selectorFallbacks: normalizeStringArray(candidate.selectorFallbacks),
    tagName: candidate.tagName,
    textPreview: typeof candidate.textPreview === "string" ? candidate.textPreview : "",
    htmlSnippet: typeof candidate.htmlSnippet === "string" ? candidate.htmlSnippet : "",
    attributes: normalizeAttributes(candidate.attributes)
  };
}

export function normalizeStoredBrowserAnnotation(value: unknown): BrowserAnnotation | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<BrowserAnnotation>;
  if (typeof candidate.id !== "string" || candidate.id.trim().length === 0) {
    return null;
  }
  if (typeof candidate.body !== "string" || candidate.body.trim().length === 0) {
    return null;
  }
  if (typeof candidate.createdAt !== "string" || candidate.createdAt.trim().length === 0) {
    return null;
  }

  const target = normalizeBrowserElementTarget(candidate.target);
  if (!target) {
    return null;
  }

  return {
    id: candidate.id,
    body: candidate.body.trim(),
    createdAt: candidate.createdAt,
    target
  };
}

export function readStoredBrowserAnnotationsByScope(): StoredBrowserAnnotationsByScope {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(BROWSER_ANNOTATIONS_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([scopeKey]) => typeof scopeKey === "string" && scopeKey.trim().length > 0)
        .map(([scopeKey, entries]) => {
          const annotations = Array.isArray(entries)
            ? entries
                .map((entry) => normalizeStoredBrowserAnnotation(entry))
                .filter((entry): entry is BrowserAnnotation => entry !== null)
            : [];
          return [scopeKey, annotations] as const;
        })
        .filter(([, annotations]) => annotations.length > 0)
    );
  } catch {
    return {};
  }
}

export function readStoredBrowserAnnotationsForScope(scopeKey: string): BrowserAnnotation[] {
  if (!scopeKey.trim()) {
    return [];
  }

  return readStoredBrowserAnnotationsByScope()[scopeKey] ?? [];
}

export function writeStoredBrowserAnnotationsForScope(scopeKey: string, annotations: BrowserAnnotation[]): void {
  if (typeof window === "undefined" || !scopeKey.trim()) {
    return;
  }

  const current = readStoredBrowserAnnotationsByScope();
  if (annotations.length) {
    current[scopeKey] = annotations;
  } else {
    delete current[scopeKey];
  }

  if (Object.keys(current).length) {
    window.localStorage.setItem(BROWSER_ANNOTATIONS_STORAGE_KEY, JSON.stringify(current));
    return;
  }

  window.localStorage.removeItem(BROWSER_ANNOTATIONS_STORAGE_KEY);
}

export function removeStoredBrowserAnnotationsForScope(scopeKey: string): void {
  writeStoredBrowserAnnotationsForScope(scopeKey, []);
}
