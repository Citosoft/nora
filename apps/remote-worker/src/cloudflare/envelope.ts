import { z } from "zod";

/** Cloudflare v4 API envelope. Only the fields the Worker reads are modelled; the rest pass through untouched. */
export const cloudflareEnvelopeSchema = z.looseObject({
  success: z.boolean(),
  errors: z.array(z.looseObject({ code: z.number(), message: z.string() })).default([]),
  result: z.unknown()
});

export const cloudflareTunnelSchema = z.looseObject({
  id: z.string().min(1).max(64),
  name: z.string(),
  deleted_at: z.string().nullable().optional()
});

export const cloudflareTunnelListSchema = z.array(cloudflareTunnelSchema);
export const cloudflareTunnelTokenSchema = z.string().min(1).max(4096);
export const cloudflareDnsRecordSchema = z.looseObject({ id: z.string().min(1), name: z.string(), content: z.string().optional() });
export const cloudflareDnsRecordListSchema = z.array(cloudflareDnsRecordSchema);
export const ignoredResultSchema = z.unknown();
