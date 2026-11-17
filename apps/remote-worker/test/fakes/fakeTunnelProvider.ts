import { UpstreamError } from "../../src/errors/upstreamError";
import type { CloudflareTunnel, DnsUpsertResult, TunnelIngressTarget, TunnelProvider } from "../../src/types/cloudflare.types";
import type { FakeDnsRecord, FakeTunnelRecord, TunnelProviderMethod } from "../types/fakes.types";

/** In-memory Cloudflare account + zone with call counting and per-method failure injection. */
export class FakeTunnelProvider implements TunnelProvider {
  readonly tunnels = new Map<string, FakeTunnelRecord>();
  readonly dns = new Map<string, FakeDnsRecord>();
  readonly calls: TunnelProviderMethod[] = [];
  readonly failing = new Set<TunnelProviderMethod>();
  private nextId = 1;

  count(method: TunnelProviderMethod): number {
    return this.calls.filter((call) => call === method).length;
  }

  liveTunnels(): FakeTunnelRecord[] {
    return [...this.tunnels.values()].filter((tunnel) => !tunnel.deleted);
  }

  private record(method: TunnelProviderMethod): void {
    this.calls.push(method);
    if (this.failing.has(method)) throw new UpstreamError("cloudflare", 500, `${method} failed`);
  }

  private live(tunnelId: string): FakeTunnelRecord | null {
    const tunnel = this.tunnels.get(tunnelId);
    return tunnel === undefined || tunnel.deleted ? null : tunnel;
  }

  async getTunnel(tunnelId: string): Promise<CloudflareTunnel | null> {
    this.record("getTunnel");
    const tunnel = this.live(tunnelId);
    return tunnel === null ? null : { id: tunnel.id, name: tunnel.name };
  }

  async findTunnelByName(name: string): Promise<CloudflareTunnel | null> {
    this.record("findTunnelByName");
    const tunnel = this.liveTunnels().find((candidate) => candidate.name === name);
    return tunnel === undefined ? null : { id: tunnel.id, name: tunnel.name };
  }

  async createTunnel(name: string, tunnelSecret: string): Promise<CloudflareTunnel> {
    this.record("createTunnel");
    if (this.liveTunnels().some((tunnel) => tunnel.name === name)) throw new UpstreamError("cloudflare", 409, "name exists");
    const id = `00000000-0000-4000-8000-${String(this.nextId++).padStart(12, "0")}`;
    this.tunnels.set(id, { id, name, secret: tunnelSecret, deleted: false, activeConnections: 0, ingress: null });
    return { id, name };
  }

  async updateTunnelSecret(tunnelId: string, tunnelSecret: string): Promise<void> {
    this.record("updateTunnelSecret");
    const tunnel = this.live(tunnelId);
    if (tunnel === null) throw new UpstreamError("cloudflare", 404, "missing");
    tunnel.secret = tunnelSecret;
  }

  async getTunnelToken(tunnelId: string): Promise<string> {
    this.record("getTunnelToken");
    const tunnel = this.live(tunnelId);
    if (tunnel === null) throw new UpstreamError("cloudflare", 404, "missing");
    return `token:${tunnel.id}:${tunnel.secret}`;
  }

  async putIngress(tunnelId: string, target: TunnelIngressTarget): Promise<void> {
    this.record("putIngress");
    const tunnel = this.live(tunnelId);
    if (tunnel === null) throw new UpstreamError("cloudflare", 404, "missing");
    tunnel.ingress = { hostname: target.hostname, port: target.port };
  }

  async deleteTunnelConnections(tunnelId: string): Promise<void> {
    this.record("deleteTunnelConnections");
    const tunnel = this.live(tunnelId);
    if (tunnel !== null) tunnel.activeConnections = 0;
  }

  async deleteTunnel(tunnelId: string): Promise<void> {
    this.record("deleteTunnel");
    const tunnel = this.live(tunnelId);
    if (tunnel === null) return;
    if (tunnel.activeConnections > 0) throw new UpstreamError("cloudflare", 400, "active connections");
    tunnel.deleted = true;
  }

  async upsertCname(fqdn: string, target: string): Promise<DnsUpsertResult> {
    this.record("upsertCname");
    const existing = this.dns.get(fqdn);
    if (existing !== undefined) {
      existing.content = target;
      return { recordId: existing.id, created: false };
    }
    const id = `dns-${this.dns.size + 1}`;
    this.dns.set(fqdn, { id, content: target });
    return { recordId: id, created: true };
  }

  async deleteCname(fqdn: string): Promise<void> {
    this.record("deleteCname");
    this.dns.delete(fqdn);
  }
}
