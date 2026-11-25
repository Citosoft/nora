import { useSettingsRuntime } from "@/components/app/hooks/useSettingsRuntime";
import { COLOR_THEME_OPTIONS } from "@/components/app/logic/colorThemes";
import type { ResolvedTheme } from "@/components/app/types";
import { cn } from "@/lib/utils";

const ORB_HALVES: ResolvedTheme[] = ["light", "dark"];

/** One named orb per theme, split diagonally into its light and dark swatches. */
export function ColorThemePicker() {
  const { colorTheme, updateColorTheme } = useSettingsRuntime();

  return (
    <div role="radiogroup" aria-label="Theme" className="flex flex-wrap gap-x-3 gap-y-2">
      {COLOR_THEME_OPTIONS.map((option) => {
        const selected = option.id === colorTheme;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => updateColorTheme(option.id)}
            className="group flex w-12 flex-col items-center gap-1.5 rounded-md py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              aria-hidden
              className={cn(
                "h-8 w-8 overflow-hidden rounded-full border transition",
                selected ? "scale-105 border-foreground" : "border-border/70 group-hover:border-foreground/40"
              )}
            >
              <span className="flex h-full w-full rotate-45">
                {ORB_HALVES.map((mode) => (
                  // The palette attributes scope each variant's CSS variables to its half.
                  <span
                    key={mode}
                    data-color-theme={option.id}
                    data-theme={mode}
                    className="h-full w-1/2 bg-[hsl(var(--theme-swatch))]"
                  />
                ))}
              </span>
            </span>
            <span className={cn("text-xs", selected ? "font-medium text-foreground" : "text-muted-foreground")}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
