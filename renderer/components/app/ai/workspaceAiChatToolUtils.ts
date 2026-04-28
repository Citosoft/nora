const MAX_READ_CHARS = 100_000;
const MAX_LINE_SLICE_LINES = 500;

export function normalizeListPrefix(prefix: string | undefined): string | undefined {
  if (!prefix?.trim()) {
    return undefined;
  }
  const normalized = prefix.replace(/\\/g, "/").replace(/^(\.\/)+/, "").replace(/^\/+/, "");
  if (!normalized || normalized === "." || normalized.startsWith("../")) {
    return undefined;
  }
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

export function filterPathsByPrefix(paths: string[], prefix: string | undefined): string[] {
  if (!prefix) {
    return paths;
  }
  return paths.filter((entry) => entry === prefix || entry.startsWith(`${prefix}/`));
}

export function shapeReadFileResult(
  raw: string,
  startLine?: number,
  endLine?: number
): {
  content: string;
  totalLines: number;
  returnedLines: number | null;
  truncated: boolean;
  truncatedReason: string | null;
} {
  const lines = raw.split(/\r?\n/);
  const totalLines = lines.length;

  if (startLine !== undefined || endLine !== undefined) {
    const start = Math.max(1, startLine ?? 1);
    const end = Math.min(totalLines, Math.max(start, endLine ?? totalLines));
    let sliceEnd = end;
    if (end - start + 1 > MAX_LINE_SLICE_LINES) {
      sliceEnd = start + MAX_LINE_SLICE_LINES - 1;
    }
    let text = lines.slice(start - 1, sliceEnd).join("\n");
    const lineTruncated = sliceEnd < end;
    let charTruncated = false;
    if (text.length > MAX_READ_CHARS) {
      text = text.slice(0, MAX_READ_CHARS);
      charTruncated = true;
    }
    const reasons: string[] = [];
    if (lineTruncated) {
      reasons.push(`Line range capped at ${MAX_LINE_SLICE_LINES} lines per read.`);
    }
    if (charTruncated) {
      reasons.push(`Result truncated to ${MAX_READ_CHARS} characters.`);
    }
    return {
      content: text,
      totalLines,
      returnedLines: sliceEnd - start + 1,
      truncated: lineTruncated || charTruncated,
      truncatedReason: reasons.length ? reasons.join(" ") : null
    };
  }

  if (raw.length > MAX_READ_CHARS) {
    return {
      content: raw.slice(0, MAX_READ_CHARS),
      totalLines,
      returnedLines: null,
      truncated: true,
      truncatedReason: `File truncated to ${MAX_READ_CHARS} characters; re-read with startLine and endLine.`
    };
  }

  return {
    content: raw,
    totalLines,
    returnedLines: null,
    truncated: false,
    truncatedReason: null
  };
}
