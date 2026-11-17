import { compareThreadEntries } from "./sorting";
import { matchesThreadSource } from "./sources";
import type { ExternalListInput, ExternalListResult, ExternalSessionEntry } from "@/components/app/types/externalSessions.types";

/** Filter and sort the complete history before limiting the preview. */
export function buildExternalSessionList({ entries, query, expanded, sourceFilter = "all", sort = "recent" }: ExternalListInput): ExternalListResult {
  const search = query.trim().toLocaleLowerCase();
  const unique = new Map<string, ExternalSessionEntry>();
  for (const entry of entries) {
    const key = JSON.stringify([entry.session.providerKind, entry.session.instanceId, entry.session.id]);
    const previous = unique.get(key);
    if (!previous || entry.workspacePath.length > previous.workspacePath.length) unique.set(key, entry);
  }
  const matches = [...unique.values()].filter(({ session, workspaceName }) =>
    matchesThreadSource({ providerKind: session.providerKind, origin: session.origin }, sourceFilter) &&
    `${session.title} ${workspaceName} ${session.providerKind} ${session.origin}`.toLocaleLowerCase().includes(search))
    .sort((a, b) => compareThreadEntries(a.session, b.session, sort));
  const visible = expanded ? matches : matches.slice(0, 5);
  return { visible, total: matches.length, hidden: matches.length - visible.length };
}
