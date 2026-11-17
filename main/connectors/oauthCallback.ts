import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { OAuthCallbackServer } from "@main/types/connectors/connectors.types";

const CALLBACK_PATH = "/callback";
const PAGE_STYLE = "font-family:system-ui,sans-serif;max-width:28rem;margin:20vh auto;padding:0 1rem;text-align:center;color:#333";

function page(response: ServerResponse, status: number, title: string, detail: string): void {
  const escape = (text: string) => text.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
  response.writeHead(status, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
  response.end(`<!doctype html><meta charset="utf-8"><title>${escape(title)}</title><body style="${PAGE_STYLE}"><h1 style="font-size:1.25rem">${escape(title)}</h1><p>${escape(detail)}</p></body>`);
}

function listen(server: Server, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => { server.off("listening", onListening); reject(error); };
    const onListening = () => {
      server.off("error", onError);
      const address = server.address();
      if (!address || typeof address === "string") reject(new Error("The sign-in callback did not get a port"));
      else resolve(address.port);
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, "127.0.0.1");
  });
}

/**
 * A loopback redirect target for one OAuth sign-in (RFC 8252). It prefers a fixed port so a dynamically registered client's
 * redirect URI stays valid between sign-ins, and falls back to any free port when that one is taken.
 */
export async function openOAuthCallback(preferredPort: number): Promise<OAuthCallbackServer> {
  const waiters = new Set<(request: IncomingMessage, response: ServerResponse) => boolean>();
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (url.pathname !== CALLBACK_PATH) { page(response, 404, "Not found", "This address only completes Nora sign-ins."); return; }
    for (const waiter of waiters) if (waiter(request, response)) return;
    page(response, 400, "Sign-in not recognised", "This sign-in was not started from Nora, or it has already finished. Start it again from Nora.");
  });
  let port: number;
  try { port = await listen(server, preferredPort); }
  catch { port = await listen(server, 0); }
  return {
    redirectUrl: `http://127.0.0.1:${port}${CALLBACK_PATH}`,
    waitForCode: (state, signal) => new Promise<string>((resolve, reject) => {
      const finish = () => { waiters.delete(waiter); signal.removeEventListener("abort", onAbort); };
      const onAbort = () => { finish(); reject(signal.reason instanceof Error ? signal.reason : new Error("The sign-in was cancelled.")); };
      const waiter = (request: IncomingMessage, response: ServerResponse): boolean => {
        const params = new URL(request.url ?? "/", "http://127.0.0.1").searchParams;
        if (params.get("state") !== state) return false;
        finish();
        const error = params.get("error");
        const code = params.get("code");
        if (error || !code) {
          const detail = params.get("error_description") ?? error ?? "The server did not return an authorization code.";
          page(response, 400, "Sign-in did not complete", `${detail} You can close this tab and try again from Nora.`);
          reject(new Error(detail));
          return true;
        }
        page(response, 200, "Signed in", "You can close this tab and return to Nora.");
        resolve(code);
        return true;
      };
      if (signal.aborted) { onAbort(); return; }
      signal.addEventListener("abort", onAbort, { once: true });
      waiters.add(waiter);
    }),
    close: () => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()); })
  };
}
