import type { FileEditorViewToggleProps } from "@/components/app/types/delimitedText.types";
import { cn } from "@/lib/utils";

/** The segmented control a file viewer tab uses to switch how its content is shown, such as Markdown preview or a CSV table. */
export function FileEditorViewToggle<T extends string>({ label, value, options, onChange }: FileEditorViewToggleProps<T>) {
  return <div className="inline-flex shrink-0 items-center rounded-md border border-border/60 bg-background p-1" role="tablist" aria-label={label}>
    {options.map(({ value: option, label: optionLabel, icon: Icon }) => <button key={option} type="button" role="tab" aria-selected={value === option}
      className={cn("inline-flex items-center gap-1.5 rounded-[3px] px-2.5 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        value === option ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
      onClick={() => onChange(option)}>
      <Icon className="size-3.5 shrink-0" aria-hidden />{optionLabel}
    </button>)}
  </div>;
}
