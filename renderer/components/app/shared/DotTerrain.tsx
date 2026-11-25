import { useDotTerrainCanvas } from "@/components/app/hooks/useDotTerrainCanvas";
import type { DotTerrainProps } from "@/components/app/types/dotTerrain.types";
import { cn } from "@/lib/utils";

/**
 * A drifting dot-matrix landscape in the app icon's pixel language, matching the withnora.run
 * hero, whose cells light up under the cursor. Decorative only; inherits its ink from the text colour.
 */
export function DotTerrain({ className, intensity = 1, clearing = false, drifting = true }: DotTerrainProps) {
  const ref = useDotTerrainCanvas({ intensity, clearing, drifting });
  return <canvas ref={ref} aria-hidden="true" className={cn("pointer-events-none text-foreground", className)} />;
}
