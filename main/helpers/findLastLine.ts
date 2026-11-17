import { open } from "node:fs/promises";

const CHUNK_BYTES = 64 * 1024;

/**
 * Scans a newline-delimited file from the end and returns the first line `accept` maps to a value, so large
 * append-only logs (session rollouts) are not read in full to find their latest record.
 */
export async function findLastLine<T>(path: string, accept: (line: string) => T | null, maxBytes = 32 * 1024 * 1024): Promise<T | null> {
  const file = await open(path, "r");
  try {
    let position = (await file.stat()).size;
    const floor = Math.max(0, position - maxBytes);
    let carry = Buffer.alloc(0);
    while (position > floor) {
      const length = Math.min(CHUNK_BYTES, position - floor);
      position -= length;
      const chunk = Buffer.alloc(length);
      await file.read(chunk, 0, length, position);
      const buffer = Buffer.concat([chunk, carry]);
      const lines = buffer.toString("utf8").split("\n");
      // The first segment may be a partial line until the previous chunk is read.
      carry = position > floor ? Buffer.from(lines.shift() ?? "", "utf8") : Buffer.alloc(0);
      for (let index = lines.length - 1; index >= 0; index--) {
        const value = lines[index]?.trim() ? accept(lines[index]) : null;
        if (value !== null) return value;
      }
    }
    return null;
  } finally { await file.close(); }
}
