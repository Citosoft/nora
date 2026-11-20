import type { ConnectorGalleryCategory, ConnectorGalleryEntry } from "@shared/types/connectors/gallery.types";
import type { McpServerLogo } from "@shared/types/provider/mcp.types";

const domain = (name: string) => ({ kind: "domain" as const, domain: name });
const GOOGLE_SETUP = { url: "https://developers.google.com/workspace/guides/configure-mcp-servers",
  note: "Google's Workspace servers need an OAuth client from your own Google Cloud project with the matching API enabled; create one marked for an AI-powered agent and paste its ID and secret." };

/**
 * Work services with official hosted MCP servers (Streamable HTTP). Only servers the services run themselves are listed, so a
 * connector added from here talks to the service directly and signs in with its own OAuth.
 */
export const CONNECTOR_GALLERY: readonly ConnectorGalleryEntry[] = [
  { id: "gmail", name: "Gmail", summary: "Read, search, draft and send mail.", url: "https://gmailmcp.googleapis.com/mcp/v1", category: "email", logo: domain("gmail.com"), registration: "client", setup: GOOGLE_SETUP },
  { id: "google-calendar", name: "Google Calendar", summary: "Events, availability and invitations.", url: "https://calendarmcp.googleapis.com/mcp/v1", category: "calendar", logo: domain("calendar.google.com"), registration: "client", setup: GOOGLE_SETUP },
  { id: "google-drive", name: "Google Drive", summary: "Find, read and organise files.", url: "https://drivemcp.googleapis.com/mcp/v1", category: "documents", logo: domain("drive.google.com"), registration: "client", setup: GOOGLE_SETUP },
  { id: "google-docs", name: "Google Docs", summary: "Read and write documents.", url: "https://docsmcp.googleapis.com/mcp/v1", category: "documents", logo: domain("docs.google.com"), registration: "client", setup: GOOGLE_SETUP },
  { id: "google-sheets", name: "Google Sheets", summary: "Read and update spreadsheets.", url: "https://sheetsmcp.googleapis.com/mcp/v1", category: "documents", logo: domain("sheets.google.com"), registration: "client", setup: GOOGLE_SETUP },
  { id: "google-slides", name: "Google Slides", summary: "Read and build presentations.", url: "https://slidesmcp.googleapis.com/mcp/v1", category: "documents", logo: domain("slides.google.com"), registration: "client", setup: GOOGLE_SETUP },
  { id: "google-chat", name: "Google Chat", summary: "Spaces, messages and threads.", url: "https://chatmcp.googleapis.com/mcp/v1", category: "chat", logo: domain("chat.google.com"), registration: "client", setup: GOOGLE_SETUP },
  { id: "slack", name: "Slack", summary: "Search and send messages, canvases and lists.", url: "https://mcp.slack.com/mcp", category: "chat", logo: domain("slack.com"), registration: "client",
    setup: { url: "https://api.slack.com/apps", note: "Slack needs a Slack app of your own (directory-listed or internal) with the MCP user scopes; paste its client ID and secret." } },
  { id: "notion", name: "Notion", summary: "Pages, databases and comments.", url: "https://mcp.notion.com/mcp", category: "documents", logo: domain("notion.so"), registration: "dynamic" },
  { id: "linear", name: "Linear", summary: "Issues, projects and cycles.", url: "https://mcp.linear.app/mcp", category: "projects", logo: domain("linear.app"), registration: "dynamic" },
  { id: "atlassian", name: "Jira & Confluence", summary: "Atlassian issues, boards and pages.", url: "https://mcp.atlassian.com/v2/mcp", category: "projects", logo: domain("atlassian.com"), registration: "dynamic" },
  { id: "asana", name: "Asana", summary: "Tasks, projects and goals.", url: "https://mcp.asana.com/v2/mcp", category: "projects", logo: domain("asana.com"), registration: "dynamic" },
  { id: "monday", name: "monday.com", summary: "Boards, items and updates.", url: "https://mcp.monday.com/mcp", category: "projects", logo: domain("monday.com"), registration: "dynamic" },
  { id: "hubspot", name: "HubSpot", summary: "Contacts, companies, deals and tickets.", url: "https://mcp.hubspot.com", category: "crm", logo: domain("hubspot.com"), registration: "client",
    setup: { url: "https://developers.hubspot.com/docs/apps/developer-platform/build-apps/integrate-with-the-remote-hubspot-mcp-server", note: "HubSpot needs an MCP auth app created under Development → MCP Auth Apps; paste its client ID and secret." } },
  { id: "intercom", name: "Intercom", summary: "Conversations, contacts and articles.", url: "https://mcp.intercom.com/mcp", category: "support", logo: domain("intercom.com"), registration: "dynamic" },
  { id: "stripe", name: "Stripe", summary: "Customers, payments, invoices and subscriptions.", url: "https://mcp.stripe.com", category: "finance", logo: domain("stripe.com"), registration: "dynamic" },
  { id: "github", name: "GitHub", summary: "Repositories, issues and pull requests.", url: "https://api.githubcopilot.com/mcp/", category: "engineering", logo: domain("github.com"), registration: "dynamic" },
  { id: "sentry", name: "Sentry", summary: "Errors, issues and releases.", url: "https://mcp.sentry.dev/mcp", category: "engineering", logo: domain("sentry.io"), registration: "dynamic" },
  { id: "figma", name: "Figma", summary: "Files, components and design context.", url: "https://mcp.figma.com/mcp", category: "design", logo: domain("figma.com"), registration: "dynamic" },
  { id: "canva", name: "Canva", summary: "Designs, templates and exports.", url: "https://mcp.canva.com/mcp", category: "design", logo: domain("canva.com"), registration: "dynamic" }
];

export const CONNECTOR_GALLERY_CATEGORIES: readonly { id: ConnectorGalleryCategory; label: string }[] = [
  { id: "email", label: "Email" }, { id: "calendar", label: "Calendar" }, { id: "documents", label: "Documents" }, { id: "chat", label: "Chat" },
  { id: "projects", label: "Projects" }, { id: "crm", label: "CRM" }, { id: "support", label: "Support" }, { id: "finance", label: "Finance" },
  { id: "design", label: "Design" }, { id: "engineering", label: "Engineering" }
];

const normalise = (url: string) => url.replace(/\/+$/, "").toLowerCase();

/** Gallery entries the user has not added yet, matched by server URL so a renamed connector still counts. */
export function galleryEntriesNotAdded(addedUrls: readonly string[]): ConnectorGalleryEntry[] {
  const added = new Set(addedUrls.map(normalise));
  return CONNECTOR_GALLERY.filter((entry) => !added.has(normalise(entry.url)));
}

/** Match the server identity independently of a connector's editable name. */
export function galleryEntryForUrl(url: string): ConnectorGalleryEntry | undefined {
  return CONNECTOR_GALLERY.find((entry) => normalise(entry.url) === normalise(url));
}

/**
 * A logo for a server before any connector to it exists here: the gallery's own when the server is listed, otherwise the
 * site's favicon, dropping an "mcp." host prefix since MCP endpoints rarely serve one themselves.
 */
export function connectorLogoForUrl(url: string): McpServerLogo | undefined {
  const listed = galleryEntryForUrl(url);
  if (listed) return listed.logo;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" || protocol === "http:" ? domain(hostname.replace(/^mcp\./, "")) : undefined;
  } catch { return undefined; }
}
