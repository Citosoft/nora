import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { join } from "node:path";
import type { BudgetedToolOutput } from "@main/types/execution/toolOutput.types";

export const TOOL_OUTPUT_INLINE_BYTES = 8_000;

function prefix(text: string, bytes: number): string {
  const buffer = Buffer.from(text);
  let end = Math.min(buffer.length, Math.max(0, bytes));
  while (end > 0 && end < buffer.length && (buffer[end] & 0xc0) === 0x80) end--;
  return buffer.subarray(0, end).toString("utf8");
}

function suffix(text: string, bytes: number): string {
  const buffer = Buffer.from(text);
  let start = Math.max(0, buffer.length - Math.max(0, bytes));
  while (start < buffer.length && (buffer[start] & 0xc0) === 0x80) start++;
  return buffer.subarray(start).toString("utf8");
}

/** Archive before replacing anything. Failure leaves the caller's original result intact. */
export async function budgetToolOutput(text: string, directory: string, maxBytes = TOOL_OUTPUT_INLINE_BYTES): Promise<BudgetedToolOutput> {
  const originalBytes = Buffer.byteLength(text);
  if (originalBytes <= maxBytes) return { text, path: null, originalBytes };
  const path = join(directory, `${createHash("sha256").update(text).digest("hex")}.txt`);
  const notice = `[Nora: output excerpt; ${originalBytes} UTF-8 bytes in the original. Full output: ${JSON.stringify(path)}. Search the file or read bounded line ranges for omitted details.]`;
  const labels = "\n\nBeginning:\n\n\nDiagnostic excerpt:\n\n\nEnd:\n";
  const available = maxBytes - Buffer.byteLength(notice + labels);
  if (available < 600) return { text, path: null, originalBytes };
  const sectionBytes = Math.floor(available / 3);
  const head = prefix(text, sectionBytes);
  const tail = suffix(text, sectionBytes);
  const middle = text.slice(head.length, text.length - tail.length);
  const match = /\b(?:error|failed|fatal|exception|traceback|panic)\b|^FAIL\b/im.exec(middle);
  const diagnosticStart = match ? Math.max(middle.lastIndexOf("\n", match.index) + 1, match.index - 40) : 0;
  const diagnostic = match ? prefix(middle.slice(diagnosticStart), sectionBytes) : "";
  const excerpt = diagnostic
    ? `${notice}\n\nBeginning:\n${head}\n\nDiagnostic excerpt:\n${diagnostic}\n\nEnd:\n${tail}`
    : `${notice}\n\nBeginning:\n${prefix(text, Math.floor(available / 2))}\n\nEnd:\n${suffix(text, Math.floor(available / 2))}`;
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const temporary = join(directory, `${randomUUID()}.tmp`);
  try {
    await fs.writeFile(temporary, text, { flag: "wx", mode: 0o600 });
    await fs.rename(temporary, path);
  } finally { await fs.rm(temporary, { force: true }); }
  return { text: excerpt, path, originalBytes };
}
