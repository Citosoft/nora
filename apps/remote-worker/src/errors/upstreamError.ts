import type { UpstreamProvider } from "../types/upstream.types";

/** A dependency (Clerk, Cloudflare or Expo) failed. Details stay server-side; the client sees a generic `upstream` error. */
export class UpstreamError extends Error {
  readonly provider: UpstreamProvider;
  readonly status: number | null;

  constructor(provider: UpstreamProvider, status: number | null, message: string) {
    super(message);
    this.name = "UpstreamError";
    this.provider = provider;
    this.status = status;
  }
}
