/** Coalesce streamed terminal lines into fewer context file writes (avoids one entry per tiny chunk). */
export const TRANSCRIPT_CONTEXT_FLUSH_DEBOUNCE_MS = 900;

export const TRANSCRIPT_CONTEXT_FLUSH_MAX_LINES = 48;

export const TRANSCRIPT_CONTEXT_FLUSH_MAX_CHARS = 14_000;

export function dedupeConsecutiveContextLines(lines: readonly string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    if (out.length === 0 || out[out.length - 1] !== line) {
      out.push(line);
    }
  }
  return out;
}

export function countBufferedContextChars(lines: readonly string[]): number {
  if (lines.length === 0) {
    return 0;
  }
  return lines.reduce((sum, line) => sum + line.length, 0) + (lines.length - 1);
}

export function shouldForceFlushContextBuffer(lines: readonly string[]): boolean {
  return (
    lines.length >= TRANSCRIPT_CONTEXT_FLUSH_MAX_LINES ||
    countBufferedContextChars(lines) >= TRANSCRIPT_CONTEXT_FLUSH_MAX_CHARS
  );
}

function contextLinesEqual(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

/**
 * Gemini and similar CLIs often redraw the same multi-line block (status table + “Tech Stack”)
 * as output grows. Removes trailing copies of the same k-line block (k ≥ minBlockSize).
 */
export function dedupeRepeatedTrailingLineBlocks(
  lines: readonly string[],
  minBlockSize: number = 3
): string[] {
  const out = [...lines];
  let safety = 0;
  while (out.length >= minBlockSize * 2 && safety < 10_000) {
    safety += 1;
    const maxBlock = Math.min(120, Math.floor(out.length / 2));
    let removed = false;
    for (let blockSize = maxBlock; blockSize >= minBlockSize; blockSize -= 1) {
      if (out.length < blockSize * 2) {
        continue;
      }
      const tail = out.slice(-blockSize);
      const previous = out.slice(-2 * blockSize, -blockSize);
      if (contextLinesEqual(tail, previous)) {
        out.splice(-blockSize, blockSize);
        removed = true;
        break;
      }
    }
    if (!removed) {
      break;
    }
  }
  return out;
}
