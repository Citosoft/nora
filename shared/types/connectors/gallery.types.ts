import type { McpServerLogo } from "@shared/types/provider/mcp.types";

/** How the user groups the gallery; the order here is the order shown. */
export type ConnectorGalleryCategory = "email" | "documents" | "calendar" | "chat" | "projects" | "crm" | "support" | "finance" | "design" | "engineering";

/**
 * A service's official hosted MCP server, ready to add as a connector. `registration` says whether the server registers Nora as an
 * OAuth client itself (`dynamic`) or the user must create an app with the service first and paste its client details (`client`).
 */
export interface ConnectorGalleryEntry {
  id: string;
  name: string;
  /** The service's own description of what the server does, in one line. */
  summary: string;
  url: string;
  category: ConnectorGalleryCategory;
  logo: McpServerLogo;
  registration: "dynamic" | "client";
  /** Where to create the OAuth client when `registration` is `client`, or other setup the service requires. */
  setup?: { url: string; note: string };
}
