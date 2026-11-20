import { findEffectiveBot } from "./catalog";
import type { BotSettings, SharedBotSet } from "@shared/types/bots/bots.types";
import type { ConnectorSubject } from "@shared/types/connectors/connectors.types";
import { z } from "zod";

/** Omitted means all available connectors; an empty list deliberately gives the bot none. */
export const botConnectorIdsSchema = z.array(z.uuid()).max(200).refine((ids) => new Set(ids).size === ids.length, "Choose each connector only once");

/** Resolve the current workspace override rather than the frozen thread persona; missing bots receive no connectors. */
export function connectorIdsForBot(settings: BotSettings | undefined, shared: readonly SharedBotSet[], subject: ConnectorSubject): readonly string[] | undefined {
  if (!subject.botId) return undefined;
  const bot = findEffectiveBot(settings, subject.workspaceId, shared, subject.botId);
  return bot ? bot.connectorIds : [];
}
