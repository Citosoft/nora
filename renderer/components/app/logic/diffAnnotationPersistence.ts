import type { StoredDiffAnnotationsByScope } from "@/components/app/types/diffAnnotationPersistence.types";
import type { DiffAnnotation, DiffAnnotationLineTarget } from "@shared/appTypes";

const DIFF_ANNOTATIONS_STORAGE_KEY = "nora-diff-annotations";

export function buildDiffAnnotationStorageKey(projectId: string, changesRoot: string | null): string {
  return `${projectId}::${changesRoot ?? ""}`;
}

function normalizeLineNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return null;
  }
  return value;
}

function normalizeDiffAnnotationLineTarget(value: unknown): DiffAnnotationLineTarget | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<DiffAnnotationLineTarget>;
  if (typeof candidate.path !== "string" || candidate.path.trim().length === 0) {
    return null;
  }

  const oldLine = normalizeLineNumber(candidate.oldLine);
  const newLine = normalizeLineNumber(candidate.newLine);
  if (oldLine === null && newLine === null) {
    return null;
  }

  return {
    path: candidate.path,
    oldLine,
    newLine,
    lineText: typeof candidate.lineText === "string" ? candidate.lineText : ""
  };
}

export function normalizeStoredDiffAnnotation(value: unknown): DiffAnnotation | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<DiffAnnotation>;
  if (typeof candidate.id !== "string" || candidate.id.trim().length === 0) {
    return null;
  }
  if (typeof candidate.body !== "string" || candidate.body.trim().length === 0) {
    return null;
  }
  if (typeof candidate.createdAt !== "string" || candidate.createdAt.trim().length === 0) {
    return null;
  }

  const target = normalizeDiffAnnotationLineTarget(candidate.target);
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

export function readStoredDiffAnnotationsByScope(): StoredDiffAnnotationsByScope {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(DIFF_ANNOTATIONS_STORAGE_KEY);
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
                .map((entry) => normalizeStoredDiffAnnotation(entry))
                .filter((entry): entry is DiffAnnotation => entry !== null)
            : [];
          return [scopeKey, annotations] as const;
        })
        .filter(([, annotations]) => annotations.length > 0)
    );
  } catch {
    return {};
  }
}

export function readStoredDiffAnnotationsForScope(scopeKey: string): DiffAnnotation[] {
  if (!scopeKey.trim()) {
    return [];
  }

  return readStoredDiffAnnotationsByScope()[scopeKey] ?? [];
}

export function writeStoredDiffAnnotationsForScope(scopeKey: string, annotations: DiffAnnotation[]): void {
  if (typeof window === "undefined" || !scopeKey.trim()) {
    return;
  }

  const current = readStoredDiffAnnotationsByScope();
  if (annotations.length) {
    current[scopeKey] = annotations;
  } else {
    delete current[scopeKey];
  }

  if (Object.keys(current).length) {
    window.localStorage.setItem(DIFF_ANNOTATIONS_STORAGE_KEY, JSON.stringify(current));
    return;
  }

  window.localStorage.removeItem(DIFF_ANNOTATIONS_STORAGE_KEY);
}
