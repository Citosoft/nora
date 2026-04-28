import { stripAnsi } from "./shell";

export const detectLocalUrlFromOutput = (
  value: string,
  host = "localhost"
): { url: string | null; port: number | null } => {
  const normalized = stripAnsi(value);
  const urlMatch = normalized.match(/https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::(\d{2,5}))?(?:\/[^\s]*)?/i);
  if (urlMatch) {
    const url = urlMatch[0].replace(/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)/i, host);
    const port = urlMatch[1] ? Number.parseInt(urlMatch[1], 10) : null;
    return { url, port: Number.isNaN(port ?? Number.NaN) ? null : port };
  }

  const localLabelMatch = normalized.match(
    /(?:local|localhost|listening|ready|server).*?(?:https?:\/\/)?(?:localhost|127\.0\.0\.1|0\.0\.0\.0)?[:\s]+(\d{2,5})/i
  );
  if (localLabelMatch) {
    const port = Number.parseInt(localLabelMatch[1], 10);
    if (!Number.isNaN(port)) {
      return { url: `http://${host}:${port}`, port };
    }
  }

  return { url: null, port: null };
};

export const didReturnToShellPrompt = (value: string): boolean => {
  const normalized = stripAnsi(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const lines = normalized
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
  const lastLine = lines.at(-1)?.trim() || "";

  if (!lastLine) {
    return false;
  }

  return (
    /^PS [^>]+>\s*$/.test(lastLine) ||
    /^[A-Za-z]:\\.*>\s*$/.test(lastLine) ||
    /^[^@\s]+@[^:\s]+:[^#$%]*[$#%]\s*$/.test(lastLine) ||
    /^[^#$%]*[$#%]\s*$/.test(lastLine)
  );
};
