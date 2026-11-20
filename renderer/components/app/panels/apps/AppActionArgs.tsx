import type { AppActionArgsProps } from "@/components/app/types/appsView.types";
import { cn } from "@/lib/utils";

const shown = (value: unknown): string => typeof value === "string" ? value : value === null || value === undefined ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value);

/** An action's arguments as plain name and value pairs, the same in the confirm sheet and the activity log. */
export function AppActionArgs({ args, className }: AppActionArgsProps) {
  const entries = Object.entries(args);
  if (!entries.length) return null;
  return <dl className={cn("grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs", className)}>
    {entries.map(([name, value]) => <div key={name} className="contents"><dt className="text-muted-foreground">{name}</dt><dd className="min-w-0 break-words">{shown(value)}</dd></div>)}
  </dl>;
}
