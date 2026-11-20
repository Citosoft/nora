import { CONNECTOR_GALLERY, galleryEntryForUrl } from "@shared/connectors/gallery";
import { connectorAvailableTo } from "@shared/connectors/access";
import type { BotTemplate, TemplateConnectorMatch } from "@shared/types/bots/bots.types";
import type { Connector, ConnectorSubject } from "@shared/types/connectors/connectors.types";

export function templateConnectorMatches(template: BotTemplate, connectors: readonly Connector[]): TemplateConnectorMatch[] {
  return template.connectorGalleryIds.flatMap((id) => {
    const entry = CONNECTOR_GALLERY.find((candidate) => candidate.id === id);
    return entry ? [{ entry, connectors: connectors.filter((connector) => galleryEntryForUrl(connector.url)?.id === id) }] : [];
  });
}

/** Multiple accounts require an explicit choice; missing services never widen access to unrelated connectors. */
export function templateConnectorIds(template: BotTemplate, connectors: readonly Connector[], subject?: ConnectorSubject): string[] {
  return templateConnectorMatches(template, connectors).flatMap((match) => {
    const available = match.connectors.filter((connector) => connector.enabled && (!subject || connectorAvailableTo(connector.access, subject)));
    return available.length === 1 ? [available[0].id] : [];
  });
}
