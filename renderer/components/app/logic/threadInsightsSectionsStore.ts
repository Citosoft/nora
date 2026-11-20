import { THREAD_INSIGHTS_SECTIONS } from "@/components/app/constants/threadInsightsSections";
import type { ThreadInsightsSectionId } from "@/components/app/types/threadInsights.types";

const STORAGE_KEY = "nora-thread-insights-hidden-sections";
const KNOWN_IDS: ReadonlySet<string> = new Set(THREAD_INSIGHTS_SECTIONS.map((section) => section.id));

function isSectionId(value: unknown): value is ThreadInsightsSectionId {
  return typeof value === "string" && KNOWN_IDS.has(value);
}

/** Keeps known section IDs only, so renamed or removed sections never linger in storage. */
export function parseHiddenSections(raw: string | null): ReadonlySet<ThreadInsightsSectionId> {
  if (!raw) return new Set();
  try {
    const parsed: unknown = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter(isSectionId) : []);
  } catch {
    return new Set();
  }
}

export function toggleHiddenSection(hidden: ReadonlySet<ThreadInsightsSectionId>, id: ThreadInsightsSectionId): ReadonlySet<ThreadInsightsSectionId> {
  const next = new Set(hidden);
  if (!next.delete(id)) next.add(id);
  return next;
}

function readStorage(): ReadonlySet<ThreadInsightsSectionId> {
  try { return parseHiddenSections(window.localStorage.getItem(STORAGE_KEY)); }
  catch { return new Set(); }
}

/** One store for every open thread, so split views showing several panels stay in step. */
let hiddenSections: ReadonlySet<ThreadInsightsSectionId> | null = null;
const listeners = new Set<() => void>();

export function readHiddenSections(): ReadonlySet<ThreadInsightsSectionId> {
  hiddenSections ??= readStorage();
  return hiddenSections;
}

export function writeHiddenSections(next: ReadonlySet<ThreadInsightsSectionId>): void {
  hiddenSections = next;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); }
  catch { /* Storage failures only cost persistence; the panel still updates for this session. */ }
  for (const listener of listeners) listener();
}

export function subscribeHiddenSections(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
