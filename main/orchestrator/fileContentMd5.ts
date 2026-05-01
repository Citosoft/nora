import { createHash } from "node:crypto";
import fs from "node:fs";

/**
 * Full-file MD5 (lowercase hex), streaming for large paths.
 */
export async function md5HexOfFile(absPath: string): Promise<string | null> {
  return new Promise((resolve) => {
    const hash = createHash("md5");
    const stream = fs.createReadStream(absPath);
    stream.on("error", () => resolve(null));
    stream.on("data", (chunk: string | Buffer) => {
      hash.update(chunk);
    });
    stream.on("end", () => {
      resolve(hash.digest("hex"));
    });
  });
}

export function md5HexOfUtf8String(text: string): string {
  return createHash("md5").update(text, "utf8").digest("hex");
}
