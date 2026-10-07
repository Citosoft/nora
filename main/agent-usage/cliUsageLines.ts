import type { ToolUsageWindow } from "@shared/appTypes";
import { clampPercent } from "./toolUsageInfo";

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

const readPercentLeft = (line: string): number | null => {
  const match = line.match(/(\d{1,3})%\s*left/i);
  return match?.[1] ? clampPercent(Number.parseInt(match[1], 10)) : null;
};

const readResetsLabel = (line: string): string | null =>
  line.match(/\(?\s*resets?\s+([^)]+)\)?/i)?.[1]?.trim() || null;

const isHourlyLine = (line: string): boolean =>
  (/hour|hourly|hr/i.test(line) && /(limit|remaining|used|usage|quota)/i.test(line)) || /^\d+h limit:/i.test(line);

const isWeeklyLine = (line: string): boolean =>
  /week|weekly|7d/i.test(line) && /(limit|remaining|used|usage|quota)/i.test(line);

const CLI_WINDOW_MATCHERS: ReadonlyArray<{ id: string; label: string; shortLabel: string; matches: (line: string) => boolean }> = [
  { id: "hourly", label: "Hourly", shortLabel: "H", matches: isHourlyLine },
  { id: "weekly", label: "Weekly", shortLabel: "W", matches: isWeeklyLine }
];

/** Parses CLI status text (Codex `/status`, auth hints) into usage windows and the signed-in account. */
export const parseCliUsageLines = (lines: string[]): { windows: ToolUsageWindow[]; account: string | null } => {
  const windows = CLI_WINDOW_MATCHERS.flatMap((matcher): ToolUsageWindow[] => {
    const line = lines.find(matcher.matches);
    const percentLeft = line ? readPercentLeft(line) : null;
    return line && percentLeft !== null
      ? [{ id: matcher.id, label: matcher.label, shortLabel: matcher.shortLabel, percentLeft, resetsLabel: readResetsLabel(line) }]
      : [];
  });
  const accountLine = lines.find((line) => EMAIL_PATTERN.test(line))
    ?? lines.find((line) => /logged in as|account|user/i.test(line))
    ?? null;
  return { windows, account: accountLine?.match(EMAIL_PATTERN)?.[0] ?? accountLine };
};
