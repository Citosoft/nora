import type { FetchLike } from "@/types/http.types";

export interface RecordedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

export type FakeHandler = (call: RecordedCall) => Response | Promise<Response>;

/** A scripted `fetch` that records each call; handlers run in order, the last one repeats. */
export function fakeFetch(...handlers: FakeHandler[]): { fetch: FetchLike; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const fetch: FetchLike = async (url, init) => {
    const headers = init.headers instanceof Headers ? Object.fromEntries(init.headers.entries()) : { ...(init.headers as Record<string, string> | undefined) };
    const call: RecordedCall = { url, method: init.method ?? "GET", headers, body: typeof init.body === "string" ? JSON.parse(init.body) : undefined };
    calls.push(call);
    const handler = handlers[Math.min(calls.length - 1, handlers.length - 1)];
    if (!handler) throw new Error("No fake response configured");
    if (init.signal?.aborted) throw new Error("aborted");
    return handler(call);
  };
  return { fetch, calls };
}

export const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const networkError = (): never => {
  throw new TypeError("Failed to fetch");
};
