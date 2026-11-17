import { z } from "zod";
import { mcpServerLogoSchema, mcpToolSchema } from "@shared/providers/mcp";
import { NORA_MCP_SERVER } from "@shared/nora-tools/catalog";
import { botIdSchema } from "@shared/bots/contracts";

/**
 * Port the OAuth sign-in callback listens on when it is free. Dynamically registered clients keep a valid redirect URI across
 * sign-ins, and users registering their own OAuth client can enter this redirect URI.
 */
export const CONNECTOR_OAUTH_CALLBACK_PORT = 47_823;
export const CONNECTOR_OAUTH_REDIRECT_URL = `http://127.0.0.1:${CONNECTOR_OAUTH_CALLBACK_PORT}/callback`;

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Remote servers must use HTTPS; plain HTTP is only accepted for servers running on this computer. */
export function isAllowedConnectorUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || (url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname));
  } catch { return false; }
}

/**
 * The name runtimes see for a connector (Claude shows its tools as `mcp__<name>__<tool>`; Codex keys config by it), so it is
 * restricted to characters every runtime accepts and never collides with Nora's own server.
 */
export const connectorServerNameSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,47}$/).refine((value) => value !== NORA_MCP_SERVER);
export const connectorIdSchema = z.uuid();
export const connectorUrlSchema = z.string().trim().max(2048).refine(isAllowedConnectorUrl, "Enter an https:// URL (http:// is only allowed for localhost)");
const headerNameSchema = z.string().trim().min(1).max(128).regex(/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/, "Enter a valid HTTP header name");

/**
 * How Nora authenticates to a connector. `oauth` signs in through the server's own OAuth flow when it asks for one (and
 * connects without credentials when it does not); a client ID is only needed for servers without dynamic registration.
 * `header` sends one fixed header, such as an API key.
 */
export const connectorAuthInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("oauth"), clientId: z.string().trim().min(1).max(512).optional(),
    clientSecret: z.string().min(1).max(4096).optional() }).strict(),
  z.object({ kind: z.literal("header"), name: headerNameSchema, value: z.string().min(1).max(8192) }).strict()
]);

/** Who a connector reaches along one dimension: everyone, or only the listed ids (never an empty list, which would reach no one). */
const connectorAudienceSchema = <T extends z.ZodString>(idSchema: T) => z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("all") }).strict(),
  z.object({ kind: z.literal("only"), ids: z.array(idSchema).min(1).max(200) }).strict()
]);
/**
 * Which threads get a connector: a thread must be in an allowed workspace and, when bots are limited, be one of those bots'
 * threads (plain threads are then left out). Group and direct chats never get connectors either way.
 */
export const connectorAccessSchema = z.object({
  workspaces: connectorAudienceSchema(z.string().min(1).max(512)),
  bots: connectorAudienceSchema(botIdSchema)
}).strict();
export const connectorInputSchema = z.object({ name: z.string().trim().min(1).max(80), url: connectorUrlSchema,
  auth: connectorAuthInputSchema, access: connectorAccessSchema.optional() }).strict();

/** What the window sees of a connector's authentication; secrets never leave the main process. */
export const connectorAuthSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("oauth"), customClient: z.boolean(), signedIn: z.boolean() }).strict(),
  z.object({ kind: z.literal("header"), name: z.string() }).strict()
]);
export const connectorStatusSchema = z.enum(["checking", "connected", "needs-auth", "failed", "disabled"]);
export const connectorSchema = z.object({ id: connectorIdSchema, name: z.string(), serverName: connectorServerNameSchema,
  url: z.string(), enabled: z.boolean(), auth: connectorAuthSchema, access: connectorAccessSchema, status: connectorStatusSchema,
  tools: z.array(mcpToolSchema), logo: mcpServerLogoSchema.optional(), message: z.string().optional() }).strict();
export const connectorListSchema = z.array(connectorSchema);
