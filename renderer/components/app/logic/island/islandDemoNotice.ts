import type { IslandDemoResult } from "@shared/types/island/island.types";
import type { IslandDemoNotice } from "@/components/app/types/island.types";

/** Explains why a preview did not appear; a shown preview speaks for itself. */
export function islandDemoNotice(result: IslandDemoResult): IslandDemoNotice | null {
  switch (result) {
    case "shown": return null;
    case "unsupported": return { title: "The notch island is macOS only", description: "Run Nora on a Mac to see it." };
    case "no-notch": return { title: "No notch on this Mac's displays", description: "The island only appears on a built-in display with a notch." };
  }
}
