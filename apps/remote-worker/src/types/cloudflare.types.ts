export interface CloudflareTunnel {
  readonly id: string;
  readonly name: string;
}

export interface TunnelIngressTarget {
  readonly hostname: string;
  readonly port: number;
}

export interface DnsUpsertResult {
  readonly recordId: string;
  readonly created: boolean;
}

export interface CloudflareClientConfig {
  readonly apiToken: string;
  readonly accountId: string;
  readonly zoneId: string;
  readonly fetch: (input: string, init: RequestInit) => Promise<Response>;
  /** Defaults to the public v4 API; overridable for tests. */
  readonly baseUrl?: string;
}

/** Typed operations the provisioning service needs from Cloudflare. */
export interface TunnelProvider {
  /** Returns null when the tunnel does not exist or has been (soft-)deleted. */
  getTunnel(tunnelId: string): Promise<CloudflareTunnel | null>;
  findTunnelByName(name: string): Promise<CloudflareTunnel | null>;
  createTunnel(name: string, tunnelSecret: string): Promise<CloudflareTunnel>;
  updateTunnelSecret(tunnelId: string, tunnelSecret: string): Promise<void>;
  getTunnelToken(tunnelId: string): Promise<string>;
  putIngress(tunnelId: string, target: TunnelIngressTarget): Promise<void>;
  /** Tolerates a tunnel that no longer exists. */
  deleteTunnelConnections(tunnelId: string): Promise<void>;
  /** Tolerates a tunnel that no longer exists. */
  deleteTunnel(tunnelId: string): Promise<void>;
  upsertCname(fqdn: string, target: string): Promise<DnsUpsertResult>;
  /** Tolerates a missing record. */
  deleteCname(fqdn: string): Promise<void>;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface CloudflareRequestOptions {
  readonly query?: Readonly<Record<string, string>>;
  readonly body?: unknown;
  /** When true a 404 resolves to null instead of throwing. */
  readonly allowNotFound?: boolean;
}
