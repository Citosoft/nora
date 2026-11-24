import { Check, Star } from "lucide-react";
import type { ModelRowProps } from "@/components/app/types/modelPicker.types";
import { cn } from "@/lib/utils";

/** A selectable model with a star that adds it to, or removes it from, Favourites. */
export function NativeModelRow({ label, description, icon, selected, disabled, favorite, favoriteDisabled, onSelect, onFavorite }: ModelRowProps) {
  return <div className={cn("group flex items-center gap-1 rounded-md pr-1 transition-colors", selected ? "bg-secondary" : "hover:bg-muted")}>
    <button type="button" aria-pressed={selected} disabled={disabled} onClick={onSelect}
      className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-md px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed">
      {icon}
      <span className="min-w-0 flex-1"><span className="block break-words text-[12px] font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{description}</span>}</span>
      {selected && <Check className="size-4 shrink-0" aria-hidden="true" />}
    </button>
    <button type="button" aria-pressed={favorite} aria-label={favorite ? `Remove ${label} from favourites` : `Add ${label} to favourites`}
      title={favorite ? "Remove from favourites" : "Add to favourites"} disabled={favoriteDisabled} onClick={() => onFavorite(!favorite)}
      className={cn("flex size-7 shrink-0 items-center justify-center rounded-md transition-opacity hover:bg-background/60 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed",
        favorite ? "text-amber-500" : "text-muted-foreground opacity-0 group-hover:opacity-100")}>
      <Star className={cn("size-3.5", favorite && "fill-current")} aria-hidden="true" />
    </button>
  </div>;
}
