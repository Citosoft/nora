import { useRef, useState, type KeyboardEvent } from "react";
import { RoleSidebarPreview } from "@/components/app/chrome/role-switcher/RoleSidebarPreview";
import { PixelTile } from "@/components/app/shared/PixelTile";
import type { RoleSwitcherPanelProps } from "@/components/app/types/windowChrome.types";
import { cn } from "@/lib/utils";

const COLUMNS = 4;

/**
 * Role tiles beside a miniature sidebar: hovering or focusing a tile previews the role's name, tagline
 * and the tools it pins, and choosing it switches the app-wide role.
 */
export function RoleSwitcherPanel({ choices, current, note, onChoose }: RoleSwitcherPanelProps) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const tiles = useRef<(HTMLButtonElement | null)[]>([]);
  const preview = choices.find((choice) => choice.selection.id === (previewId ?? current?.id)) ?? null;
  // Arrow keys move through the grid like a keypad.
  const move = (event: KeyboardEvent, index: number): void => {
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLUMNS, ArrowUp: -COLUMNS }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    tiles.current[Math.min(choices.length - 1, Math.max(0, index + step))]?.focus();
  };
  return <div className="flex overflow-hidden rounded-[inherit]">
    <RoleSidebarPreview role={preview?.selection.id ?? null} />
    <div className="min-w-0 flex-1 p-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Work role</p>
      <div key={preview?.selection.id ?? "none"} className="pixel-text-in mt-1 min-h-[2.5rem]" aria-live="polite">
        <p className="truncate text-sm font-medium">{preview?.label ?? "Choose a role"}</p>
        <p className="truncate text-[11px] text-muted-foreground">{preview?.presentation.description ?? "Shapes your sidebar, starters and Nora's guidance."}</p>
      </div>
      <div role="radiogroup" aria-label="Work role" className="mt-2.5 grid grid-cols-4 gap-1.5" onMouseLeave={() => setPreviewId(null)}>
        {choices.map(({ selection, label, presentation: { icon: Icon, shortLabel } }, index) => {
          const selected = selection.id === current?.id;
          return <PixelTile key={selection.id} ref={(node) => { tiles.current[index] = node; }} icon={Icon} active={selected} role="radio" aria-checked={selected} aria-label={label}
            title={shortLabel} tabIndex={selected || (!current && index === 0) ? 0 : -1}
            onMouseEnter={() => setPreviewId(selection.id)} onFocus={() => setPreviewId(selection.id)} onBlur={() => setPreviewId(null)}
            onKeyDown={(event) => move(event, index)} onClick={() => onChoose(selection)} />;
        })}
      </div>
      {note && <p role={note.tone === "error" ? "alert" : undefined} title={note.text}
        className={cn("mt-2.5 truncate text-[10px]", note.tone === "error" ? "text-destructive" : "text-muted-foreground")}>{note.text}</p>}
    </div>
  </div>;
}
