import { DotTerrain } from "@/components/app/shared/DotTerrain";
import type { ThreadBackdropProps } from "@/components/app/types/dotTerrain.types";

/** The pixel terrain behind a thread, softened so the greeting, messages and composer stay readable; it drifts only while the thread works. */
export function ThreadBackdrop({ variant, working }: ThreadBackdropProps) {
  return <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
    {variant === "greeting" ? <DotTerrain className="size-full" clearing drifting={working} /> : <DotTerrain className="size-full" intensity={0.35} drifting={working} />}
  </div>;
}
