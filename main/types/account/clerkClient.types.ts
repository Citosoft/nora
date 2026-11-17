import type { AccountSession } from "@main/types/account/session.types";
import type { TokenStorage } from "@clerk/electron";

export interface ClerkNativeClientOptions {
  host: string;
  tokens: TokenStorage;
  fetch: typeof fetch;
  session(): AccountSession | null;
}
export interface ClerkNativeRequest<T> {
  path: string;
  sessionSelection: "query" | "path";
  method?: "GET" | "POST" | "PATCH";
  body?: URLSearchParams;
  parse(input: unknown): T;
}
export interface ClerkNativeClient {
  request<T>(session: AccountSession, signal: AbortSignal, request: ClerkNativeRequest<T>): Promise<T>;
}
