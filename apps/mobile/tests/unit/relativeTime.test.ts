import { afterEach, describe, expect, it, vi } from "vitest";

const now = new Date("2026-11-22T12:00:00.000Z");
const ago = (seconds: number): string => new Date(now.getTime() - seconds * 1000).toISOString();

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("formatRelativeEnglish", () => {
  it("matches Intl's numeric auto wording for adjacent calendar units", async () => {
    const { formatRelativeEnglish } = await import("@/state/relativeTime");
    expect(formatRelativeEnglish(-1, "day")).toBe("yesterday");
    expect(formatRelativeEnglish(1, "week")).toBe("next week");
    expect(formatRelativeEnglish(-1, "year")).toBe("last year");
  });

  it("counts other values with singular and plural units", async () => {
    const { formatRelativeEnglish } = await import("@/state/relativeTime");
    expect(formatRelativeEnglish(-1, "hour")).toBe("1 hour ago");
    expect(formatRelativeEnglish(-5, "minute")).toBe("5 minutes ago");
    expect(formatRelativeEnglish(3, "day")).toBe("in 3 days");
  });
});

describe("relativeTime", () => {
  it("does not throw when the runtime has no Intl.RelativeTimeFormat (Hermes on iOS)", async () => {
    vi.stubGlobal("Intl", { ...Intl, RelativeTimeFormat: undefined });
    const { relativeTime } = await import("@/state/relativeTime");
    expect(relativeTime(ago(5 * 60), now)).toBe("5 minutes ago");
    expect(relativeTime(ago(30 * 3_600), now)).toBe("yesterday");
    expect(relativeTime(ago(3), now)).toBe("just now");
  });

  it("uses Intl.RelativeTimeFormat when it exists", async () => {
    const { relativeTime } = await import("@/state/relativeTime");
    expect(relativeTime(ago(2 * 3_600), now)).toBe(new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(-2, "hour"));
  });
});
