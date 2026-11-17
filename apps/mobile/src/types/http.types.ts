import type { z } from "zod";

/** Returns a fresh Clerk session token, or null when nobody is signed in. Called once per request. */
export type TokenProvider = () => Promise<string | null>;

/** The subset of `fetch` the clients use, injectable for tests. */
export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

/** Which service a request went to, so failures can be described in words that fit it. */
export type RemoteService = "runtime" | "directory";

/** Every way a request can fail, typed so callers decide retry and display without parsing strings. */
export type RequestFailure<TCode extends string> =
  | { kind: "api"; status: number; code: TCode; message: string }
  | { kind: "http"; status: number }
  | { kind: "network"; message: string }
  | { kind: "timeout"; timeoutMs: number }
  | { kind: "signed-out" }
  | { kind: "invalid-response"; issues: string };

export interface ErrorEnvelope<TCode extends string> {
  error: { code: TCode; message: string };
}

export interface JsonRequestOptions<TResult, TCode extends string> {
  service: RemoteService;
  method: HttpMethod;
  url: string;
  /** Null sends the request anonymously when an endpoint explicitly supports it. */
  getToken: TokenProvider | null;
  fetch: FetchLike;
  timeoutMs: number;
  schema: z.ZodType<TResult>;
  errorSchema: z.ZodType<ErrorEnvelope<TCode>>;
  body?: object;
}

export interface HttpClientConfig {
  getToken: TokenProvider;
  fetch: FetchLike;
  timeoutMs: number;
}
