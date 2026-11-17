import type { AccountSession } from "@main/types/account/session.types";
import type { ClerkNativeClient, ClerkNativeClientOptions, ClerkNativeRequest } from "@main/types/account/clerkClient.types";

const TOKEN_KEY = "__clerk_client_jwt";

/** Serializes native Frontend API requests because each response can rotate the shared encrypted client token. */
export function createClerkNativeClient(options: ClerkNativeClientOptions): ClerkNativeClient {
  let queue = Promise.resolve();
  const assertSession = (expected: AccountSession): void => {
    const current = options.session();
    if (!current || current.userId !== expected.userId || current.sessionId !== expected.sessionId) throw new Error("Your account changed. Sign in and try again.");
  };
  const perform = async <T>(session: AccountSession, signal: AbortSignal, input: ClerkNativeRequest<T>): Promise<T> => {
    const bounded = AbortSignal.any([signal, AbortSignal.timeout(20_000)]);
    bounded.throwIfAborted(); assertSession(session);
    const token = await options.tokens.getItem(TOKEN_KEY);
    bounded.throwIfAborted(); assertSession(session);
    if (!token) throw new Error("Sign in again to use account services.");
    const url = new URL(input.path, `https://${options.host}`);
    if (url.origin !== `https://${options.host}`) throw new Error("Invalid account endpoint.");
    url.searchParams.set("_is_native", "1");
    if (input.sessionSelection === "query") url.searchParams.set("_clerk_session_id", session.sessionId);
    url.searchParams.set("__clerk_api_version", "2026-05-12");
    const response = await options.fetch(url, { method: input.method ?? "GET", signal: bounded,
      redirect: "error", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" },
      ...(input.body ? { body: input.body } : {}) }).catch(() => {
      bounded.throwIfAborted(); throw new Error("Account services could not be reached. Local changes are kept for retry.");
    });
    bounded.throwIfAborted(); assertSession(session);
    if (!response.ok) throw new Error(response.status === 429 ? "Account services are busy. Try again shortly."
      : response.status === 401 || response.status === 403 ? "Sign in again to use account services." : "Account services could not complete this request.");
    const body: unknown = await response.json();
    const result = input.parse(body);
    bounded.throwIfAborted(); assertSession(session);
    const authorization = response.headers.get("Authorization");
    if (authorization) await options.tokens.setItem(TOKEN_KEY, authorization.replace(/^Bearer /, ""));
    bounded.throwIfAborted(); assertSession(session);
    return result;
  };
  return {
    request(session, signal, input) {
      const job = queue.then(() => perform(session, signal, input));
      queue = job.then(() => undefined, () => undefined);
      return job;
    }
  };
}
