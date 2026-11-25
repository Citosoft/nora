import { z } from "zod";
import { UpstreamError } from "../errors/upstreamError";
import type { ExpoPushClient, ExpoPushClientOptions, ExpoPushTicket } from "../types/push.types";

export const EXPO_PUSH_SEND_URL = "https://exp.host/--/api/v2/push/send";
/** Expo rejects requests carrying more than 100 messages. */
export const EXPO_MAX_MESSAGES_PER_REQUEST = 100;

const ticketSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok") }),
  z.object({ status: z.literal("error"), details: z.object({ error: z.string().optional() }).optional() })
]);
const sendResponseSchema = z.object({ data: z.array(ticketSchema) });

/**
 * Adapts Expo's push API. Failures become `UpstreamError` without Expo's payload, which can echo push tokens; tokens
 * and message contents are never logged.
 */
export function createExpoPushClient(options: ExpoPushClientOptions): ExpoPushClient {
  return {
    async send(messages) {
      if (messages.length === 0) return [];
      if (messages.length > EXPO_MAX_MESSAGES_PER_REQUEST) throw new Error("Expo push chunk too large");
      let response: Response;
      try {
        response = await options.fetch(EXPO_PUSH_SEND_URL, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${options.accessToken}`
          },
          body: JSON.stringify(messages)
        });
      } catch {
        throw new UpstreamError("expo", null, "push send request failed");
      }
      if (!response.ok) throw new UpstreamError("expo", response.status, "push send rejected");
      let json: unknown;
      try {
        json = await response.json();
      } catch {
        throw new UpstreamError("expo", response.status, "push send returned non-JSON");
      }
      const parsed = sendResponseSchema.safeParse(json);
      if (!parsed.success || parsed.data.data.length !== messages.length) {
        throw new UpstreamError("expo", response.status, "push send returned an unexpected shape");
      }
      return parsed.data.data.map((ticket): ExpoPushTicket => ticket.status === "ok"
        ? { kind: "ok" }
        : { kind: "error", deviceNotRegistered: ticket.details?.error === "DeviceNotRegistered" });
    }
  };
}
