/** A dependency (Clerk or Cloudflare) failed. Details stay server-side; the client sees a generic `upstream` error. */
export class UpstreamError extends Error {
  readonly provider: "clerk" | "cloudflare";
  readonly status: number | null;

  constructor(provider: "clerk" | "cloudflare", status: number | null, message: string) {
    super(message);
    this.name = "UpstreamError";
    this.provider = provider;
    this.status = status;
  }
}
