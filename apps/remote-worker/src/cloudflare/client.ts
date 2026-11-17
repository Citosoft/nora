import type { z } from "zod";
import { UpstreamError } from "../errors/upstreamError";
import type {
  CloudflareClientConfig,
  CloudflareRequestOptions,
  CloudflareTunnel,
  HttpMethod,
  TunnelProvider
} from "../types/cloudflare.types";
import {
  cloudflareDnsRecordListSchema,
  cloudflareDnsRecordSchema,
  cloudflareEnvelopeSchema,
  cloudflareTunnelListSchema,
  cloudflareTunnelSchema,
  cloudflareTunnelTokenSchema,
  ignoredResultSchema
} from "./envelope";

const DEFAULT_BASE_URL = "https://api.cloudflare.com/client/v4";

/** Creates the fetch-based Cloudflare adaptor. Responses are parsed into internal shapes; raw payloads never escape. */
export function createCloudflareClient(config: CloudflareClientConfig): TunnelProvider {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const accountPath = `/accounts/${encodeURIComponent(config.accountId)}/cfd_tunnel`;
  const zonePath = `/zones/${encodeURIComponent(config.zoneId)}/dns_records`;
  const tunnelPath = (tunnelId: string): string => `${accountPath}/${encodeURIComponent(tunnelId)}`;

  async function request<T>(method: HttpMethod, path: string, schema: z.ZodType<T>, options: CloudflareRequestOptions = {}): Promise<T | null> {
    const url = new URL(`${baseUrl}${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) url.searchParams.set(key, value);
    const init: RequestInit = {
      method,
      headers: { Authorization: `Bearer ${config.apiToken}`, "Content-Type": "application/json" }
    };
    if (options.body !== undefined) init.body = JSON.stringify(options.body);

    let response: Response;
    try {
      response = await config.fetch(url.toString(), init);
    } catch {
      throw new UpstreamError("cloudflare", null, `${method} ${path}: network error`);
    }
    if (response.status === 404 && options.allowNotFound === true) return null;

    const json: unknown = await response.json().catch(() => null);
    const envelope = cloudflareEnvelopeSchema.safeParse(json);
    if (!response.ok || !envelope.success || !envelope.data.success) {
      const codes = envelope.success ? envelope.data.errors.map((error) => error.code).join(",") : "unparseable";
      throw new UpstreamError("cloudflare", response.status, `${method} ${path}: status ${response.status} codes ${codes}`);
    }
    const result = schema.safeParse(envelope.data.result);
    if (!result.success) throw new UpstreamError("cloudflare", response.status, `${method} ${path}: unexpected result shape`);
    return result.data;
  }

  async function requireResult<T>(method: HttpMethod, path: string, schema: z.ZodType<T>, options: CloudflareRequestOptions = {}): Promise<T> {
    const result = await request(method, path, schema, options);
    if (result === null) throw new UpstreamError("cloudflare", 404, `${method} ${path}: not found`);
    return result;
  }

  return {
    async getTunnel(tunnelId) {
      const tunnel = await request("GET", tunnelPath(tunnelId), cloudflareTunnelSchema, { allowNotFound: true });
      return tunnel === null || isDeleted(tunnel) ? null : toTunnel(tunnel);
    },

    async findTunnelByName(name) {
      const tunnels = await requireResult("GET", accountPath, cloudflareTunnelListSchema, {
        query: { name, is_deleted: "false" }
      });
      // The filter is server-side, but match exactly and skip deleted ones in case it is ever loosened.
      const match = tunnels.find((tunnel) => tunnel.name === name && !isDeleted(tunnel));
      return match === undefined ? null : toTunnel(match);
    },

    async createTunnel(name, tunnelSecret) {
      const tunnel = await requireResult("POST", accountPath, cloudflareTunnelSchema, {
        body: { name, config_src: "cloudflare", tunnel_secret: tunnelSecret }
      });
      return toTunnel(tunnel);
    },

    async updateTunnelSecret(tunnelId, tunnelSecret) {
      await requireResult("PATCH", tunnelPath(tunnelId), cloudflareTunnelSchema, { body: { tunnel_secret: tunnelSecret } });
    },

    async getTunnelToken(tunnelId) {
      return requireResult("GET", `${tunnelPath(tunnelId)}/token`, cloudflareTunnelTokenSchema);
    },

    async putIngress(tunnelId, target) {
      await requireResult("PUT", `${tunnelPath(tunnelId)}/configurations`, ignoredResultSchema, {
        body: {
          config: {
            ingress: [
              { hostname: target.hostname, service: `http://127.0.0.1:${target.port}` },
              { service: "http_status:404" }
            ]
          }
        }
      });
    },

    async deleteTunnelConnections(tunnelId) {
      await request("DELETE", `${tunnelPath(tunnelId)}/connections`, ignoredResultSchema, { allowNotFound: true });
    },

    async deleteTunnel(tunnelId) {
      await request("DELETE", tunnelPath(tunnelId), ignoredResultSchema, { allowNotFound: true });
    },

    async upsertCname(fqdn, target) {
      const record = { type: "CNAME", name: fqdn, content: target, proxied: true, ttl: 1 };
      const existing = await findCname(fqdn);
      if (existing !== null) {
        if (existing.content !== target) {
          await requireResult("PUT", `${zonePath}/${encodeURIComponent(existing.id)}`, cloudflareDnsRecordSchema, { body: record });
        }
        return { recordId: existing.id, created: false };
      }
      const created = await requireResult("POST", zonePath, cloudflareDnsRecordSchema, { body: record });
      return { recordId: created.id, created: true };
    },

    async deleteCname(fqdn) {
      const existing = await findCname(fqdn);
      if (existing === null) return;
      await request("DELETE", `${zonePath}/${encodeURIComponent(existing.id)}`, ignoredResultSchema, { allowNotFound: true });
    }
  };

  async function findCname(fqdn: string): Promise<z.infer<typeof cloudflareDnsRecordSchema> | null> {
    const records = await requireResult("GET", zonePath, cloudflareDnsRecordListSchema, {
      query: { type: "CNAME", "name.exact": fqdn }
    });
    return records.find((record) => record.name.toLowerCase() === fqdn.toLowerCase()) ?? null;
  }
}

function isDeleted(tunnel: z.infer<typeof cloudflareTunnelSchema>): boolean {
  return tunnel.deleted_at !== undefined && tunnel.deleted_at !== null;
}

function toTunnel(tunnel: z.infer<typeof cloudflareTunnelSchema>): CloudflareTunnel {
  return { id: tunnel.id, name: tunnel.name };
}
