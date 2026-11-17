import { ChevronRight, EyeOff } from "lucide-react";
import { formatTokens } from "@/components/app/logic/contextTokens";
import type { ChatContextSectionProps } from "@/components/app/types/chatContext.types";

const PLACEMENT_LABEL = { system: "System", history: "History", turn: "Message" } as const;

/** One part of a request: its label, where it sits and its estimated size, expanding to the exact text sent. */
export function ChatContextSection({ tally: { section, tokens } }: ChatContextSectionProps) {
  const meta = <span className="ml-auto flex shrink-0 items-center gap-2 text-muted-foreground">
    <span className="rounded border px-1 text-[10px] uppercase tracking-wide">{PLACEMENT_LABEL[section.placement]}</span>
    <span className="w-12 text-right tabular-nums">{tokens === null ? "—" : `≈${formatTokens(tokens)}`}</span>
  </span>;
  if (section.text === null) return <div className="flex items-start gap-1.5 px-2 py-1.5 text-muted-foreground">
    <EyeOff className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
    <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate">{section.label}</span>{meta}</div>
      {section.note && <p className="mt-0.5 text-[11px] leading-snug">{section.note}</p>}</div>
  </div>;
  return <details className="group rounded-md">
    <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <ChevronRight className="size-3 shrink-0 transition-transform group-open:rotate-90" aria-hidden="true" />
      <span className="truncate">{section.label}</span>{meta}
    </summary>
    <pre className="thin-scrollbar mx-2 mb-2 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted/40 p-2 font-mono text-[11px] leading-relaxed">{section.text}</pre>
  </details>;
}
