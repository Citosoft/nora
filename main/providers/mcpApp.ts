import { z } from "zod";
import { MCP_APP_PAYLOAD_MAX_BYTES, MCP_APP_RESOURCE_MIME_TYPE, mcpAppCallSchema, mcpAppResourceUriSchema, mcpAppToolResultSchema } from "@shared/conversations/mcpApp";
import type { McpAppCall, McpAppToolResult } from "@shared/types/conversation/mcpApp.types";
import type { McpAppCallSource, McpAppResource, McpAppToolUi } from "@main/types/execution/mcpApp.types";

const visibilitySchema = z.array(z.enum(["model", "app"])).catch([]);
const toolMetaSchema = z.object({
  ui: z.object({ resourceUri: z.string().optional(), visibility: z.unknown().optional() }).passthrough().nullish().catch(null),
  /** Deprecated flat key from early MCP Apps drafts. */
  "ui/resourceUri": z.string().nullish().catch(null)
}).passthrough();

/**
 * Who may call a tool (MCP Apps `ui.visibility`), declared whether or not the tool has a widget of its own;
 * null when the server left it open to both audiences.
 */
export function readMcpAppToolVisibility(meta: unknown): McpAppToolUi["visibility"] {
  const visibility = toolMetaSchema.safeParse(meta).data?.ui?.visibility;
  return visibility == null ? null : visibilitySchema.parse(visibility);
}

/** Reads a tool descriptor's MCP Apps `_meta`; anything other than a `ui://` widget address yields null. */
export function readMcpAppToolUi(meta: unknown): McpAppToolUi | null {
  const parsed = toolMetaSchema.safeParse(meta);
  if (!parsed.success) return null;
  const resourceUri = mcpAppResourceUriSchema.safeParse(parsed.data.ui?.resourceUri ?? parsed.data["ui/resourceUri"]);
  return resourceUri.success ? { resourceUri: resourceUri.data, visibility: readMcpAppToolVisibility(meta) } : null;
}

/** Whether a widget may call a tool itself: tools default to both audiences unless the server narrowed them. */
export function mcpAppMayCallTool(visibility: McpAppToolUi["visibility"]): boolean {
  return !visibility || visibility.includes("app");
}

function withinBound(value: unknown): boolean {
  return Buffer.byteLength(JSON.stringify(value)) <= MCP_APP_PAYLOAD_MAX_BYTES;
}

/** Shapes a widget call for the transcript; raw input and result are kept only while they fit the payload bound. */
export function mcpAppCall(source: McpAppCallSource): McpAppCall | null {
  const input = source.input !== null && typeof source.input === "object" && !Array.isArray(source.input) && withinBound(source.input) ? source.input : undefined;
  const result = source.result ? { content: source.result.content,
    ...(source.result.structuredContent != null ? { structuredContent: source.result.structuredContent } : {}),
    ...(source.result.isError != null ? { isError: source.result.isError } : {}) } : undefined;
  const parsed = mcpAppCallSchema.safeParse({ server: source.server, tool: source.tool, resourceUri: source.resourceUri,
    displayMode: source.displayMode ?? "inline", ...(input ? { input } : {}), ...(result && withinBound(result) ? { result } : {}) });
  return parsed.success ? parsed.data : null;
}

/** Widget documents are small single pages; anything larger is refused rather than served. */
export const MCP_APP_HTML_MAX_BYTES = 4 * 1024 * 1024;

const httpsOrigins = z.array(z.string()).catch([]).transform((values) => values.flatMap((value) => {
  if (!URL.canParse(value)) return [];
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password ? [url.origin] : [];
}));
const resourceMetaSchema = z.object({ ui: z.object({
  csp: z.object({ connectDomains: httpsOrigins.optional(), resourceDomains: httpsOrigins.optional(),
    frameDomains: httpsOrigins.optional(), baseUriDomains: httpsOrigins.optional() }).passthrough().nullish().catch(null),
  permissions: z.object({ camera: z.unknown().optional(), microphone: z.unknown().optional(),
    geolocation: z.unknown().optional(), clipboardWrite: z.unknown().optional() }).passthrough().nullish().catch(null),
  prefersBorder: z.boolean().nullish().catch(null)
}).passthrough().nullish().catch(null) }).passthrough().nullish().catch(null);
const resourceContentSchema = z.object({ mimeType: z.string().optional(), text: z.string().optional(), blob: z.string().optional(),
  _meta: z.unknown().optional() }).passthrough();

function isMcpAppMimeType(mimeType: string | undefined): boolean {
  return mimeType?.replace(/\s+/g, "").toLowerCase() === MCP_APP_RESOURCE_MIME_TYPE;
}

/** Picks the widget document from a `resources/read` result and validates the sandbox it asks for. */
export function readMcpAppResource(contents: unknown): McpAppResource | null {
  const entries = z.array(z.unknown()).safeParse(contents);
  if (!entries.success) return null;
  for (const entry of entries.data) {
    const content = resourceContentSchema.safeParse(entry);
    if (!content.success || !isMcpAppMimeType(content.data.mimeType)) continue;
    const html = content.data.text ?? (content.data.blob ? Buffer.from(content.data.blob, "base64").toString("utf8") : null);
    if (!html || Buffer.byteLength(html) > MCP_APP_HTML_MAX_BYTES) return null;
    const ui = resourceMetaSchema.parse(content.data._meta)?.ui;
    const permissions = ui?.permissions;
    return { html,
      csp: { connectDomains: ui?.csp?.connectDomains ?? [], resourceDomains: ui?.csp?.resourceDomains ?? [],
        frameDomains: ui?.csp?.frameDomains ?? [], baseUriDomains: ui?.csp?.baseUriDomains ?? [] },
      permissions: Object.fromEntries((["camera", "microphone", "geolocation", "clipboardWrite"] as const)
        .filter((feature) => permissions?.[feature] != null).map((feature) => [feature, {}])),
      ...(ui?.prefersBorder != null ? { prefersBorder: ui.prefersBorder } : {}) };
  }
  return null;
}

/** Validates a widget-initiated tool call's result before it goes back to the widget. */
export function readMcpAppToolResult(value: unknown): McpAppToolResult | null {
  const parsed = mcpAppToolResultSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  const loose = z.object({ content: z.array(z.json()), structuredContent: z.json().nullish(), isError: z.boolean().nullish() }).safeParse(value);
  return loose.success ? { content: loose.data.content,
    ...(loose.data.structuredContent != null ? { structuredContent: loose.data.structuredContent } : {}),
    ...(loose.data.isError != null ? { isError: loose.data.isError } : {}) } : null;
}
