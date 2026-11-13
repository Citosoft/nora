import type { ComposerMentionListProps } from "@/components/app/types/composerInput.types";

/** Suggestions for the @-mention being typed; the textarea keeps focus and drives the active option. */
export function ComposerMentionList({ id, options, activeIndex, onPick, onHover }: ComposerMentionListProps) {
  return <ul id={id} role="listbox" aria-label="Mention a bot"
    className="absolute bottom-full left-0 z-20 mb-2 max-h-64 w-72 overflow-y-auto rounded-md border bg-popover p-1 shadow-popover">
    {options.map((option, index) => <li key={option.id} id={`${id}-${index}`} role="option" aria-selected={index === activeIndex}
      onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => onHover(index)} onClick={() => onPick(option)}
      className={`flex cursor-default items-center gap-2 rounded px-2 py-1.5 text-sm ${index === activeIndex ? "bg-accent text-accent-foreground" : ""}`}>
      {option.icon}<span className="min-w-0 flex-1 truncate">{option.name}</span>
      {option.detail && <span className="max-w-[45%] truncate text-xs text-muted-foreground">{option.detail}</span>}
    </li>)}
  </ul>;
}
