import type { ComposerSuggestionListProps } from "@/components/app/types/composerInput.types";

/** Suggestions for the composer token being typed; the textarea keeps focus and drives the active option. */
export function ComposerSuggestionList({ id, label, message, loading, onRetry, options, activeIndex, onPick, onHover }: ComposerSuggestionListProps) {
  return <ul id={id} role="listbox" aria-label={label}
    className="absolute bottom-full left-0 z-20 mb-2 max-h-64 w-[min(28rem,100%)] overflow-y-auto rounded-md border bg-popover p-1 shadow-popover">
    {!options.length && <li role="presentation" className="px-3 py-3 text-xs text-muted-foreground"><span role={loading ? "status" : undefined}>{message || "No matches"}</span>{onRetry && <button type="button" className="ml-2 rounded underline focus-visible:ring-2 focus-visible:ring-ring" onMouseDown={(event) => event.preventDefault()} onClick={onRetry}>Retry</button>}</li>}
    {options.map((option, index) => <li key={option.id} id={`${id}-${index}`} role="option" aria-selected={index === activeIndex}
      onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => onHover(index)} onClick={() => onPick(option)}
      ref={(element) => { if (index === activeIndex) element?.scrollIntoView({ block: "nearest" }); }}
      className={`flex cursor-default items-center gap-2 rounded px-2 py-1.5 text-sm ${index === activeIndex ? "bg-accent text-accent-foreground" : ""}`}>
      {option.icon}<span className={option.insertText ? "shrink-0 font-mono" : "min-w-0 flex-1 truncate"}>{option.name}</span>
      {option.detail && <span className={option.insertText ? "min-w-0 flex-1 truncate text-xs text-muted-foreground" : "max-w-[45%] truncate text-xs text-muted-foreground"} title={option.detail}>{option.detail}</span>}
    </li>)}
  </ul>;
}
