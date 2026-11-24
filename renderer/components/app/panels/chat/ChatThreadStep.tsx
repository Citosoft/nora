import { chatTime } from "@/components/app/logic/chatTimeline";
import type { ChatThreadStepProps } from "@/components/app/types/chatThreadDetail.types";

/** One step on the timeline: an icon on the rail, a line of text, an optional detail and its time. */
export function ChatThreadStep({ icon: Icon, iconClass, spin, at, children, detail }: ChatThreadStepProps) {
  return <li className="relative flex gap-3 pb-3 text-[12px] last:pb-0">
    <span className="relative z-10 flex h-5 w-4 shrink-0 items-center justify-center bg-background">
      <Icon aria-hidden="true" className={`size-3.5 ${iconClass ?? "text-muted-foreground"} ${spin ? "motion-safe:animate-spin" : ""}`} /></span>
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline gap-2"><p className="min-w-0 flex-1 leading-5">{children}</p>
        {at && <time dateTime={at} className="shrink-0 text-xs text-muted-foreground">{chatTime(at)}</time>}</div>
      {detail}
    </div>
  </li>;
}
