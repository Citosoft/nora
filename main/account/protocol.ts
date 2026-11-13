import { net, protocol } from "electron";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNT_ORIGIN, ACCOUNT_SCHEME, accountAssetPath } from "./assets";

export function registerAccountProtocol(directory: string, frontendHost: string | null): void {
  const csp = [
    // The existing Monaco AMD loader fetches from jsDelivr and uses runtime evaluation.
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://cdn.jsdelivr.net ${frontendHost ? `https://${frontendHost}` : ""} https://challenges.cloudflare.com https://*.protect.clerk.com`,
    "object-src 'none'", "base-uri 'none'"
  ].join("; ");
  protocol.handle(ACCOUNT_SCHEME, async (request) => {
    if (request.url === `${ACCOUNT_ORIGIN}/storage-migration`) {
      return new Response("<!doctype html><html><head><title>Nora</title></head><body></body></html>", { headers: { "Content-Type": "text/html", "Content-Security-Policy": "default-src 'none'" } });
    }
    const asset = accountAssetPath(request.url);
    if (!asset) return new Response("Not found", { status: 404 });
    const response = await net.fetch(pathToFileURL(join(directory, asset)).toString());
    const headers = new Headers(response.headers);
    headers.set("Content-Security-Policy", csp);
    headers.set("Cache-Control", "no-store");
    return new Response(response.body, { status: response.status, headers });
  });
}
