import { z } from "zod";
import type { KeyedMetadataSnapshot } from "../types/directoryStore.types";

const recordSchema = z.record(z.string(), z.unknown());

/**
 * Pure parse of a `{ [id]: entry }` map stored under one private-metadata key. Malformed entries (or entries filed
 * under a key that does not match their own ID) are skipped and reported, so one bad value never hides the rest.
 */
export function parseKeyedMetadata<T>(
  privateMetadata: unknown,
  metadataKey: string,
  schema: z.ZodType<T>,
  idOf: (entry: T) => string
): KeyedMetadataSnapshot<T> {
  const metadata = recordSchema.safeParse(privateMetadata);
  if (!metadata.success) return { entries: [], invalidKeys: [], malformed: true };
  const value = metadata.data[metadataKey];
  if (value === undefined || value === null) return { entries: [], invalidKeys: [] };
  const raw = recordSchema.safeParse(value);
  if (!raw.success) return { entries: [], invalidKeys: [], malformed: true };

  const entries: T[] = [];
  const invalidKeys: string[] = [];
  for (const [key, item] of Object.entries(raw.data)) {
    if (item === null) continue;
    const entry = schema.safeParse(item);
    if (entry.success && idOf(entry.data) === key) entries.push(entry.data);
    else invalidKeys.push(key);
  }
  return { entries, invalidKeys };
}
