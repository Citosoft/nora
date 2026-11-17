import type { SidebarTabBarProps } from "@/components/app/types/changesPanelSections.types";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Underlined tabs for the right sidebar. With `iconOnlyInactive`, only the active tab is labelled and the rest are
 * icons with tooltips, so a narrow sidebar never truncates labels.
 */
export function SidebarTabBar<T extends string>({ items, active, ariaLabel, iconOnlyInactive = false, onChange }: SidebarTabBarProps<T>) {
  return <div role="tablist" aria-label={ariaLabel} className="flex shrink-0 items-center gap-0.5 border-b border-border/60 px-2">
    {items.map(({ id, label, Icon, title, indicator }) => {
      const selected = id === active;
      const showLabel = selected || !iconOnlyInactive;
      const button = <button type="button" role="tab" aria-selected={selected} aria-label={label} onClick={() => onChange(id)}
        className={cn("relative flex h-10 min-w-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selected ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
        {Icon && <Icon className="size-4 shrink-0" />}
        {showLabel && <span className="truncate">{label}</span>}
        {indicator}
        {selected && <span aria-hidden="true" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
      </button>;
      return showLabel && !title ? <span key={id} className="min-w-0">{button}</span> : <Tooltip key={id} content={title ?? label} side="bottom">{button}</Tooltip>;
    })}
  </div>;
}
