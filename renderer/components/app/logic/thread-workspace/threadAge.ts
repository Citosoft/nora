import type { ThreadAgeValue } from "@/components/app/types/thread-workspace/list.types";

export function formatThreadAge(updatedAt: string, now: number): ThreadAgeValue | null {
  const timestamp = Date.parse(updatedAt);
  if (!Number.isFinite(timestamp) || !Number.isFinite(now)) return null;
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return { label: "now", description: "Last activity just now" };
  const units = [
    { seconds: 365 * 86400, short: "y", name: "year" },
    { seconds: 30 * 86400, short: "mo", name: "month" },
    { seconds: 7 * 86400, short: "w", name: "week" },
    { seconds: 86400, short: "d", name: "day" },
    { seconds: 3600, short: "h", name: "hour" },
    { seconds: 60, short: "m", name: "minute" }
  ];
  const unit = units.find((entry) => seconds >= entry.seconds);
  if (!unit) return null;
  const count = Math.floor(seconds / unit.seconds);
  return { label: `${count}${unit.short}`, description: `Last activity ${count} ${unit.name}${count === 1 ? "" : "s"} ago` };
}
