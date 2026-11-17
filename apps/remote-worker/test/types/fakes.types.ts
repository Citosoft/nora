export interface FakeTunnelRecord {
  readonly id: string;
  readonly name: string;
  secret: string;
  deleted: boolean;
  activeConnections: number;
  ingress: { readonly hostname: string; readonly port: number } | null;
}

export interface FakeDnsRecord {
  readonly id: string;
  content: string;
}

export type TunnelProviderMethod =
  | "getTunnel"
  | "findTunnelByName"
  | "createTunnel"
  | "updateTunnelSecret"
  | "getTunnelToken"
  | "putIngress"
  | "deleteTunnelConnections"
  | "deleteTunnel"
  | "upsertCname"
  | "deleteCname";

export interface RecordedFetchCall {
  readonly method: string;
  readonly url: URL;
  readonly body: unknown;
  readonly authorization: string | null;
}

export interface CannedFetchResponse {
  readonly status: number;
  readonly body: unknown;
}
