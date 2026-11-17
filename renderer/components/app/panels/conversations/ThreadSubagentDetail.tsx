import type { ThreadSubagentDetailProps } from "@/components/app/types/threadSubagents.types";

/** A labelled, scrollable block of agent text such as its task or result. */
export function ThreadSubagentDetail({ title, children }: ThreadSubagentDetailProps) {
  return <div>
    <p className="mb-1 text-[10px] font-medium text-muted-foreground">{title}</p>
    <p className="thin-scrollbar max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-muted/50 p-2 text-[11px] leading-relaxed">{children}</p>
  </div>;
}
