import { inboxCommandRequestSchema, inboxResponseSchema } from "@shared/remote-access/runtimeApi";
import type { RuntimeApiOptions } from "@main/types/remote-access/http/runtime.types";
import { RuntimeFailure } from "./failure";

/**
 * Read, done and snooze marks from a remote client. They change only the user's own inbox, never what an agent does, so
 * unlike conversation commands they are not written to the remote activity log.
 */
export function applyRemoteInboxCommand(options: RuntimeApiOptions, body: unknown): Response {
  const input = inboxCommandRequestSchema.safeParse(body);
  if (!input.success) throw new RuntimeFailure("invalid", input.error.issues[0]?.message ?? "This inbox change is not valid.");
  try { return Response.json(inboxResponseSchema.parse(options.inbox.execute(input.data.command))); }
  catch (error) { throw new RuntimeFailure("conflict", error instanceof Error ? error.message : "The inbox could not be updated."); }
}
