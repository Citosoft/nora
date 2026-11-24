import { cn } from "@/lib/utils";
import type { ChatSectionLabelProps } from "@/components/app/types/chatWork.types";

/** The chat sidebar's section heading, shared by the Work list and a thread's detail so both read the same. */
export function ChatSectionLabel({ className, children }: ChatSectionLabelProps) {
  return <h3 className={cn("text-[10px] font-semibold uppercase tracking-wide text-muted-foreground", className)}>{children}</h3>;
}
