import { findEffectiveBot } from "./catalog";
import type { BotSettings, SharedBotSet } from "@shared/types/bots/bots.types";
import type { ConnectorSubject } from "@shared/types/connectors/connectors.types";
import { z } from "zod";

/** Omitted means all available connectors; an empty list deliberately gives the bot none. */
export const botConnectorIdsSchema = z.array(z.uuid()).max(200).refine((ids) => new Set(ids).size === ids.length, "Choose each connector only once");
/**
 * Connectors the bot's runtime account provides (for Claude, claude.ai connectors), named as the runtime lists them so the
 * choice also works for teammates sharing the bot. Omitted or empty gives the bot none: account connectors are opt-in per bot.
 */
export const botAccountConnectorsSchema = z.array(z.string().trim().min(1).max(200)).max(100)
  .refine((names) => new Set(names).size === names.length, "Choose each account connector only once");

/** Resolve the current workspace override rather than the frozen thread persona; missing bots receive no connectors. */
export function connectorIdsForBot(settings: BotSettings | undefined, shared: readonly SharedBotSet[], subject: ConnectorSubject): readonly string[] | undefined {
  if (!subject.botId) return undefined;
  const bot = findEffectiveBot(settings, subject.workspaceId, shared, subject.botId);
  return bot ? bot.connectorIds : [];
}

/** The live bot's account connectors; a thread that is not a bot's, or whose bot is gone, gets none. */
export function accountConnectorsForBot(settings: BotSettings | undefined, shared: readonly SharedBotSet[], subject: ConnectorSubject): readonly string[] {
  if (!subject.botId) return [];
  return findEffectiveBot(settings, subject.workspaceId, shared, subject.botId)?.accountConnectors ?? [];
}
