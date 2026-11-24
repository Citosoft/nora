import { menuItemClass, menuSurfaceClass } from "@/components/ui/menu-styles";
import { cn } from "@/lib/utils";
import type { ComposerSuggestionListProps } from "@/components/app/types/composerInput.types";

/** Suggestions for the composer token being typed; the textarea keeps focus and drives the active option. */
export function ComposerSuggestionList({ id, label, message, loading, onRetry, options, activeIndex, onPick, onHover }: ComposerSuggestionListProps) {
  return <ul id={id} role="listbox" aria-label={label}
    className={cn("absolute bottom-full left-0 z-20 mb-2 max-h-64 w-[min(28rem,100%)] overflow-y-auto", menuSurfaceClass)}>
    {!options.length && <li role="presentation" className="px-2 py-2.5 text-[12px] text-muted-foreground"><span role={loading ? "status" : undefined}>{message || "No matches"}</span>{onRetry && <button type="button" className="ml-2 rounded underline focus-visible:ring-2 focus-visible:ring-ring" onMouseDown={(event) => event.preventDefault()} onClick={onRetry}>Retry</button>}</li>}
    {options.map((option, index) => <li key={option.id} id={`${id}-${index}`} role="option" aria-selected={index === activeIndex}
      onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => onHover(index)} onClick={() => onPick(option)}
      ref={(element) => { if (index === activeIndex) element?.scrollIntoView({ block: "nearest" }); }}
      // The textarea keeps focus, so the active option is highlighted from state rather than :hover or :focus.
      className={cn(menuItemClass, "hover:bg-transparent", index === activeIndex && "bg-accent/70 hover:bg-accent/70 [&>svg]:text-popover-foreground")}>
      {option.icon}<span className={option.insertText ? "shrink-0 font-mono" : "min-w-0 flex-1 truncate"}>{option.name}</span>
      {option.detail && <span className={option.insertText ? "min-w-0 flex-1 truncate text-xs text-muted-foreground" : "max-w-[45%] truncate text-xs text-muted-foreground"} title={option.detail}>{option.detail}</span>}
    </li>)}
  </ul>;
}
