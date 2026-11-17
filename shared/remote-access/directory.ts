import { z } from "zod";
import { REMOTE_LIMITS } from "./constants";

/** Control-plane (Worker) contract. Entries are non-sensitive references only: never credentials or user content. */
export const installationIdSchema = z.string().regex(/^[A-Za-z0-9_-]{16,64}$/, "Installation IDs are 16-64 URL-safe characters");
export const runtimeNameSchema = z.string().trim().min(1).max(REMOTE_LIMITS.runtimeNameMaxLength);
export const runtimeEnvironmentSchema = z.enum(["desktop", "server"]);
export const runtimeHostnameSchema = z.string().min(4).max(253).regex(/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/);
export const runtimePortSchema = z.number().int().min(1024).max(65535);

export const runtimeDirectoryEntrySchema = z.object({
  installationId: installationIdSchema,
  name: runtimeNameSchema,
  environment: runtimeEnvironmentSchema,
  hostname: runtimeHostnameSchema,
  tunnelId: z.string().min(1).max(64),
  registeredAt: z.string().datetime()
}).strict();

export const provisionRuntimeRequestSchema = z.object({
  installationId: installationIdSchema,
  name: runtimeNameSchema,
  environment: runtimeEnvironmentSchema,
  /** Loopback port the runtime API listens on; the tunnel's ingress forwards the hostname to it. */
  port: runtimePortSchema
}).strict();
/** The connector token is returned only to the authenticated owner and only for that runtime's tunnel. */
export const provisionRuntimeResponseSchema = z.object({ runtime: runtimeDirectoryEntrySchema, connectorToken: z.string().min(1).max(4096) }).strict();
export const rotateRuntimeResponseSchema = provisionRuntimeResponseSchema;
export const listRuntimesResponseSchema = z.object({ runtimes: z.array(runtimeDirectoryEntrySchema).max(32) }).strict();
export const renameRuntimeRequestSchema = z.object({ name: runtimeNameSchema }).strict();
export const runtimeResponseSchema = z.object({ runtime: runtimeDirectoryEntrySchema }).strict();
export const deleteRuntimeResponseSchema = z.object({ deleted: z.literal(true), installationId: installationIdSchema }).strict();

export const directoryErrorCodeSchema = z.enum(["unauthenticated", "forbidden", "not-found", "invalid", "quota", "rate-limited", "conflict", "upstream", "internal"]);
export const directoryErrorSchema = z.object({ error: z.object({ code: directoryErrorCodeSchema, message: z.string().min(1).max(500) }).strict() }).strict();

export const DIRECTORY_ROUTES = Object.freeze({
  provision: "/v1/runtimes/provision",
  list: "/v1/runtimes",
  runtime: (installationId: string) => `/v1/runtimes/${encodeURIComponent(installationId)}`,
  rotate: (installationId: string) => `/v1/runtimes/${encodeURIComponent(installationId)}/rotate`
});
