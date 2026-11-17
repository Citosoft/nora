import { randomBytes } from "node:crypto";
import { REMOTE_LIMITS } from "@shared/remote-access/constants";
import type { RealtimeTickets, RuntimeTicket } from "@main/types/remote-access/http/runtime.types";

export function createRealtimeTickets(now: () => number): RealtimeTickets {
  const tickets = new Map<string, RuntimeTicket>();
  const prune = () => { for (const [key, value] of tickets) if (value.expiresAt <= now()) tickets.delete(key); };
  return {
    issue(identity) {
      prune();
      if (tickets.size >= 128) throw new Error("Too many pending realtime tickets.");
      const ticket = randomBytes(32).toString("base64url");
      const expiresAt = Math.min(identity.expiresAt, now() + REMOTE_LIMITS.realtimeTicketTtlMs);
      tickets.set(ticket, { identity, expiresAt });
      return { ticket, expiresAt: new Date(expiresAt).toISOString() };
    },
    consume(ticket) {
      const entry = tickets.get(ticket); tickets.delete(ticket); prune();
      return entry && entry.expiresAt > now() && entry.identity.expiresAt > now() ? entry.identity : null;
    },
    clear() { tickets.clear(); }
  };
}
