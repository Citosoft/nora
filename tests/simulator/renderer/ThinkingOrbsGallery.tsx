import { ThinkingOrb } from "thinking-orbs";
import type { OrbState } from "thinking-orbs";

const states = ["working", "searching", "solving", "listening", "connecting", "weaving", "composing", "breathing", "shaping"] as const satisfies readonly OrbState[];
const sizes = [20, 32, 64] as const;

/** Compare every shipped animation at inline, thread-status and avatar sizes. */
export function ThinkingOrbsGallery() {
  return <details open className="shrink-0 border-b bg-background">
    <summary className="cursor-pointer px-4 py-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
      Orb gallery · all 9 animations
    </summary>
    <section aria-label="Thinking orb gallery" className="max-h-[45vh] overflow-y-auto px-4 pb-4">
      <p className="mb-3 text-sm text-muted-foreground">All available styles at 20, 32 and 64 px. Threads and bot chats use 32 px. Use Toggle theme to compare light and dark mode.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {states.map((state) => <figure key={state} className="rounded-lg border bg-card p-3">
          <figcaption className="mb-2 text-sm font-medium capitalize">{state}</figcaption>
          <div className="flex items-end justify-around gap-4">
            {sizes.map((size) => <div key={size} className="flex flex-col items-center gap-2">
              <div className="flex h-16 items-center justify-center"><ThinkingOrb state={state} size={size} aria-label={`${state}, ${size} pixels`} /></div>
              <span className="text-xs text-muted-foreground">{size} px</span>
            </div>)}
          </div>
        </figure>)}
      </div>
    </section>
  </details>;
}
