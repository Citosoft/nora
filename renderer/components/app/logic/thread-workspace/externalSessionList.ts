import { compareThreadEntries } from "./sorting";
import { matchesThreadSource } from "./sources";
import type { ExternalListInput, ExternalSessionEntry } from "@/components/app/types/externalSessions.types";

/** Filter and sort the complete history; each thread group limits its own preview (see `previewThreadGroup`). */
export function buildExternalSessionList({ entries, query, sourceFilter = "all", sort = "recent" }: ExternalListInput): ExternalSessionEntry[] {
  const search = query.trim().toLocaleLowerCase();
  const unique = new Map<string, ExternalSessionEntry>();
  for (const entry of entries) {
    const key = JSON.stringify([entry.session.providerKind, entry.session.instanceId, entry.session.id]);
    const previous = unique.get(key);
    if (!previous || entry.workspacePath.length > previous.workspacePath.length) unique.set(key, entry);
  }
  return [...unique.values()].filter(({ session, workspaceName }) =>
    matchesThreadSource({ providerKind: session.providerKind, origin: session.origin }, sourceFilter) &&
    `${session.title} ${workspaceName} ${session.providerKind} ${session.origin}`.toLocaleLowerCase().includes(search))
    .sort((a, b) => compareThreadEntries(a.session, b.session, sort));
}
