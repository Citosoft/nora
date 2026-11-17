import { effectiveBots } from "@shared/bots/catalog";
import type { ConnectorAccess, ConnectorAudience } from "@shared/types/connectors/connectors.types";
import type { ConnectorAccessChoice, ConnectorAccessChoices, ConnectorAccessDraft, ConnectorAccessResult, ConnectorAccessSource,
  ConnectorAccessSummaryPart, ConnectorAudienceDraft, ConnectorBotChoice } from "@/components/app/types/noraConnectors.types";

const draftOf = (audience: ConnectorAudience): ConnectorAudienceDraft => audience.kind === "all" ? { kind: "all", ids: [] } : { kind: "only", ids: audience.ids };
export const connectorAccessDraft = (access: ConnectorAccess): ConnectorAccessDraft => ({ workspaces: draftOf(access.workspaces), bots: draftOf(access.bots) });
export const EVERYWHERE_ACCESS_DRAFT: ConnectorAccessDraft = { workspaces: { kind: "all", ids: [] }, bots: { kind: "all", ids: [] } };

/**
 * The access to save, keeping only ids the user can still see (a removed workspace or bot drops out), or why it cannot be saved:
 * "only" needs at least one pick, or the connector would reach no thread.
 */
export function buildConnectorAccess(draft: ConnectorAccessDraft, choices: ConnectorAccessChoices): ConnectorAccessResult {
  const audience = (value: ConnectorAudienceDraft, known: readonly ConnectorAccessChoice[]): ConnectorAudience | null => {
    if (value.kind === "all") return { kind: "all" };
    const ids = value.ids.filter((id) => known.some((choice) => choice.id === id));
    return ids.length ? { kind: "only", ids } : null;
  };
  const workspaces = audience(draft.workspaces, choices.workspaces);
  if (!workspaces) return { ok: false, message: "Choose at least one workspace, or make the connector available in all of them." };
  const bots = audience(draft.bots, choices.bots);
  if (!bots) return { ok: false, message: "Choose at least one bot, or make the connector available to every thread." };
  return { ok: true, access: { workspaces, bots } };
}

/** Every workspace, and every bot across them: global bots once, then each workspace's own bots labelled with that workspace. */
export function buildConnectorAccessChoices(source: ConnectorAccessSource): ConnectorAccessChoices {
  const settings = source.personalization.bots;
  const bots = new Map<string, ConnectorBotChoice>();
  const add = (bot: { id: string; name: string; avatar: ConnectorBotChoice["avatar"] }, detail: string) => {
    if (!bots.has(bot.id)) bots.set(bot.id, { kind: "bot", id: bot.id, name: bot.name, detail, avatar: bot.avatar });
  };
  for (const { bot } of effectiveBots(settings, null, [])) add(bot, "All workspaces");
  for (const workspace of source.workspaces) {
    for (const { bot } of effectiveBots(settings, workspace.id, source.sharedBots)) add(bot, workspace.name);
  }
  // Workspace avatars are keyed by the shell project when there is one, matching the workspace switcher.
  return { workspaces: source.workspaces.map(({ id, name, shellProjectId }) => ({ kind: "workspace" as const, id, name, avatar: { id: shellProjectId ?? id, name } })),
    bots: [...bots.values()] };
}

/** The limited dimensions of a connector's access, each named by its one pick or counted, with the picks still known for their icons. */
export function summarizeConnectorAccess(access: ConnectorAccess, choices: ConnectorAccessChoices): ConnectorAccessSummaryPart[] {
  const part = (audience: ConnectorAudience, known: readonly ConnectorAccessChoice[], noun: string): ConnectorAccessSummaryPart | null => {
    if (audience.kind === "all") return null;
    const picked = known.filter((choice) => audience.ids.includes(choice.id));
    const label = audience.ids.length > 1 ? `${audience.ids.length} ${noun}s` : picked[0]?.name ?? `1 ${noun}`;
    return { label, choices: picked };
  };
  return [part(access.workspaces, choices.workspaces, "workspace"), part(access.bots, choices.bots, "bot")]
    .filter((entry): entry is ConnectorAccessSummaryPart => entry !== null);
}

/** The summary as text, such as "Everywhere", "Acme · 2 bots" or "2 workspaces · Reviewer". */
export function describeConnectorAccess(access: ConnectorAccess, choices: ConnectorAccessChoices): string {
  const parts = summarizeConnectorAccess(access, choices);
  return parts.length ? parts.map((part) => part.label).join(" · ") : "Everywhere";
}
