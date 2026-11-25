import { DotTerrain } from "@/components/app/shared/DotTerrain";
import type { ThreadBackdropProps } from "@/components/app/types/dotTerrain.types";

/** The drifting pixel terrain behind a thread, softened so the greeting, messages and composer stay readable. */
export function ThreadBackdrop({ variant }: ThreadBackdropProps) {
  return <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
    {variant === "greeting" ? <DotTerrain className="size-full" clearing /> : <DotTerrain className="size-full" intensity={0.35} />}
  </div>;
}
