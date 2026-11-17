/** Bound each file read while preserving Unicode exactly, including surrogate pairs. */
export function* referenceChunks(text: string, maxBytes = 8_000): Generator<string> {
  let part = "", bytes = 0;
  for (const point of text) {
    const size = Buffer.byteLength(point);
    if (bytes + size > maxBytes && part) { yield part; part = ""; bytes = 0; }
    part += point; bytes += size;
  }
  if (part || !text) yield part;
}
