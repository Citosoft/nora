import { GitBranch, LoaderCircle } from "lucide-react";
import { TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ChatTabCloseButton } from "./ChatTabCloseButton";
import type { ChatTabProps } from "@/components/app/types/chatPanels.types";

/**
 * A work thread or branch behind the chat, as a tab: what it is, where it runs, and whether it is busy or waiting on you.
 * Closing settles the thread (reopen it from the sidebar); a thread still working must be stopped first.
 */
export function ChatTab({ thread, onClose }: ChatTabProps) {
  const status = thread.waiting ? "waiting for you" : thread.working ? "working" : thread.settled ? "settled" : null;
  const kind = thread.branch ? "branch" : "task";
  return <div className="flex min-w-0 shrink-0 items-center">
    <TabsTrigger value={thread.id} title={[thread.title, thread.workspaceName, status].filter(Boolean).join(" · ")}
    aria-label={`${thread.title}${thread.workspaceName ? ` in ${thread.workspaceName}` : ""}${status ? `, ${status}` : ""}`}
    className={cn("max-w-[14rem] shrink-0 gap-1.5 rounded-md py-1 pl-2.5 pr-1.5", thread.settled && "opacity-70")}>
    {thread.waiting ? <span className="size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
      : thread.working ? <LoaderCircle className="size-3 shrink-0 motion-safe:animate-spin" aria-hidden="true" />
      : thread.branch ? <GitBranch className="size-3 shrink-0" aria-hidden="true" /> : null}
    <span className="truncate">{thread.title}</span>
    {thread.workspaceName && <span className="shrink-0 font-normal text-muted-foreground">{thread.workspaceName}</span>}
    </TabsTrigger>
    {!thread.settled && <ChatTabCloseButton label={thread.working ? `Stop this ${kind} before closing it` : `Close ${thread.title} (settles the ${kind})`}
      disabled={thread.working} onClose={onClose} />}
  </div>;
}
