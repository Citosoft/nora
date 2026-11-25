import type { PixelTileProps } from "@/components/app/types/pixelTile.types";
import { cn } from "@/lib/utils";

/** Square icon tile shared by the role switcher and the workspace home; the corner pixel echoes the app icon. */
export function PixelTile({ icon: Icon, active, className, type = "button", ...button }: PixelTileProps) {
  return <button type={type} {...button}
    className={cn("relative grid aspect-square place-items-center rounded-lg border transition-[transform,background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
      active ? "border-primary/50 bg-primary text-primary-foreground shadow-sm" : "border-border/60 bg-background/60 text-muted-foreground hover:-translate-y-px hover:border-border hover:text-foreground",
      className)}>
    <Icon className="size-4" aria-hidden="true" />
    {active && <span aria-hidden="true" className="absolute right-1 top-1 size-1 rounded-[1px] bg-primary-foreground/80" />}
  </button>;
}
