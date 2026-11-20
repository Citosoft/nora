import { ChevronRight } from "lucide-react";
import { ChatSectionLabel } from "./ChatSectionLabel";
import type { ChatWorkSectionProps } from "@/components/app/types/chatWork.types";

export function ChatWorkSection({ title, count, children }: ChatWorkSectionProps) {
  return <details open className="group/work-section">
    <summary className="group/label mb-1 cursor-pointer list-none rounded px-2 py-1 focus-visible:outline focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
      <ChatSectionLabel className="flex items-center gap-1.5 group-hover/label:text-foreground">
        <ChevronRight aria-hidden="true" className="size-3 shrink-0 transition-transform group-open/work-section:rotate-90" />
        <span className="flex-1">{title}</span><span className="font-normal tabular-nums">{count}</span>
      </ChatSectionLabel>
    </summary>
    {children}
  </details>;
}
