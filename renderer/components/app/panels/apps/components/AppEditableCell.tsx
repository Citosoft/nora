import { useEffect, useState } from "react";
import type { AppEditableCellProps } from "@/components/app/types/appsComponents.types";
import { cn } from "@/lib/utils";

/** A table cell that turns into an input on click and hands back the new value on Enter or blur; Escape puts the old one back. */
export function AppEditableCell({ text, numeric, onCommit }: AppEditableCellProps) {
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => { setDraft(null); }, [text]);
  if (draft === null) return <button type="button" onClick={() => setDraft(text)} title="Click to edit"
    className={cn("-mx-1 w-full truncate rounded px-1 text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", numeric && "text-right tabular-nums")}>{text || "—"}</button>;
  const commit = (): void => { if (draft !== text) onCommit(draft); setDraft(null); };
  return <input autoFocus type={numeric ? "number" : "text"} value={draft} aria-label="Edit value" onChange={(event) => setDraft(event.target.value)} onBlur={commit}
    onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commit(); } else if (event.key === "Escape") setDraft(null); }}
    onClick={(event) => event.stopPropagation()}
    className={cn("-mx-1 w-full rounded border border-primary/50 bg-background px-1 py-0.5 text-xs focus:outline-none", numeric && "text-right tabular-nums")} />;
}
