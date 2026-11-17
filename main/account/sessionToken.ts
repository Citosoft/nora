import type { AccountSession } from "@main/types/account/session.types";
import { z } from "zod";
import type { ClerkNativeClient } from "@main/types/account/clerkClient.types";

const tokenSchema = z.object({ jwt: z.string().min(1).max(8192) });

/** Mint a short-lived session JWT; never send Clerk's native client token to a runtime or the control plane. */
export async function mintSessionToken(client: ClerkNativeClient, session: AccountSession, signal: AbortSignal): Promise<string> {
  return client.request(session, signal, { path: `/v1/client/sessions/${encodeURIComponent(session.sessionId)}/tokens`,
    sessionSelection: "path", method: "POST", body: new URLSearchParams(), parse: (input) => {
      const result = tokenSchema.safeParse(input);
      if (!result.success) throw new Error("Account services returned an invalid session token. Sign in again and retry.");
      return result.data.jwt;
    } });
}
