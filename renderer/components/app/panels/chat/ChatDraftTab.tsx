import { GitBranch } from "lucide-react";
import { TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ChatTabCloseButton } from "./ChatTabCloseButton";
import type { ChatDraftTabProps } from "@/components/app/types/chatPanels.types";

/** A branch that has not been sent yet, under its generated name once it has one; closing it discards the draft. */
export function ChatDraftTab({ draft, name, onClose }: ChatDraftTabProps) {
  const label = draft.title ?? (draft.naming ? "Naming…" : "New branch");
  return <div className="flex shrink-0 items-center">
    <TabsTrigger value={draft.key} className="max-w-[14rem] gap-1.5 rounded-md py-1 pl-2.5 pr-1.5" title={label}
      aria-label={`${draft.title ? `Branch “${draft.title}”` : "New branch"} with ${name}`}>
      <GitBranch className="size-3 shrink-0" aria-hidden="true" /><span className={cn("truncate", draft.naming && "text-shimmer")}>{label}</span>
    </TabsTrigger>
    {!draft.threadId && <ChatTabCloseButton label="Discard this branch" onClose={onClose} />}
  </div>;
}
