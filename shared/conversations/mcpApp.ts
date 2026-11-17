import { z } from "zod";

/** MCP Apps (SEP-1865) widgets are addressed by `ui://` resources only. */
export const MCP_APP_RESOURCE_SCHEME = "ui:";
/** The MIME type an MCP Apps resource must declare. */
export const MCP_APP_RESOURCE_MIME_TYPE = "text/html;profile=mcp-app";
/** Upper bound for the call input and result kept on a tool item for its widget; larger payloads fall back to the text output. */
export const MCP_APP_PAYLOAD_MAX_BYTES = 64 * 1024;

export const mcpAppResourceUriSchema = z.string().min(1).max(2048)
  .refine((value) => URL.canParse(value) && new URL(value).protocol === MCP_APP_RESOURCE_SCHEME, "Expected a ui:// resource");
export const mcpAppDisplayModeSchema = z.enum(["inline", "fullscreen"]);
/** The raw MCP `CallToolResult` handed to the widget; text-only transcripts keep using the item's `output`. */
export const mcpAppToolResultSchema = z.object({
  content: z.array(z.json()),
  structuredContent: z.json().optional(),
  isError: z.boolean().optional()
}).strict();
/** A tool call whose server declared a widget for it. */
export const mcpAppCallSchema = z.object({
  server: z.string().min(1).max(512),
  tool: z.string().min(1).max(512),
  resourceUri: mcpAppResourceUriSchema,
  displayMode: mcpAppDisplayModeSchema,
  /** Raw call arguments; absent when they exceeded the payload bound. */
  input: z.record(z.string(), z.json()).optional(),
  /** Raw call result; absent while running or when it exceeded the payload bound. */
  result: mcpAppToolResultSchema.optional()
}).strict();
