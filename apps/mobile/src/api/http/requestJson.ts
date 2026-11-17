import type { z } from "zod";
import type { JsonRequestOptions, RequestFailure } from "@/types/http.types";
import { RemoteRequestError } from "./remoteRequestError";

/**
 * One JSON request with a fresh bearer token, a hard timeout (covering the body read) and schema validation of both the
 * success reply and the error envelope. Every failure is thrown as a typed `RemoteRequestError`.
 */
export async function requestJson<TResult, TCode extends string>(options: JsonRequestOptions<TResult, TCode>): Promise<TResult> {
  const fail = (failure: RequestFailure<TCode>): RemoteRequestError<TCode> => new RemoteRequestError(options.service, failure);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.getToken) {
    const token = await options.getToken();
    if (!token) throw fail({ kind: "signed-out" });
    headers.Authorization = `Bearer ${token}`;
  }
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs);
  let status: number;
  let ok: boolean;
  let text: string;
  try {
    const init: RequestInit = { method: options.method, headers, signal: controller.signal, credentials: "omit" };
    if (options.body !== undefined) init.body = JSON.stringify(options.body);
    const response = await options.fetch(options.url, init);
    status = response.status;
    ok = response.ok;
    text = await response.text();
  } catch (error) {
    if (timedOut) throw fail({ kind: "timeout", timeoutMs: options.timeoutMs });
    throw fail({ kind: "network", message: error instanceof Error ? error.message : "Network request failed" });
  } finally {
    clearTimeout(timer);
  }

  const json = parseJson(text);
  if (!ok) {
    const envelope = json.ok ? options.errorSchema.safeParse(json.value) : null;
    if (envelope?.success) throw fail({ kind: "api", status, code: envelope.data.error.code, message: envelope.data.error.message });
    throw fail({ kind: "http", status });
  }
  if (!json.ok) throw fail({ kind: "invalid-response", issues: "Reply was not JSON" });
  const parsed = options.schema.safeParse(json.value);
  if (!parsed.success) throw fail({ kind: "invalid-response", issues: summarizeIssues(parsed.error) });
  return parsed.data;
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

function summarizeIssues(error: z.ZodError): string {
  return error.issues.slice(0, 3).map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ");
}
