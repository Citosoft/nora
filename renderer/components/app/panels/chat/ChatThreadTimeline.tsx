import { CircleAlert, CircleCheck, CircleHelp, CircleStop, Clock3, CornerDownRight, LoaderCircle, MessageSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ChatThreadStep as Step } from "./ChatThreadStep";
import type { ChatThreadTimelineProps, ChatThreadTurnOutcome, ChatThreadTurnSummary } from "@/components/app/types/chatThreadDetail.types";

const OUTCOME_ICONS: Record<ChatThreadTurnOutcome["kind"], LucideIcon> = {
  queued: Clock3, working: LoaderCircle, waiting: CircleHelp, done: CircleCheck, stopped: CircleStop, failed: CircleAlert
};
const OUTCOME_COLORS: Partial<Record<ChatThreadTurnOutcome["kind"], string>> = {
  waiting: "text-orange-500", done: "text-green-600 dark:text-green-400", failed: "text-destructive"
};
const count = (n: number, noun: string): string => `${n} ${noun}${n === 1 ? "" : "s"}`;
const workDone = (turn: ChatThreadTurnSummary): string => [turn.tools ? count(turn.tools, "tool call") : null,
  turn.failedTools ? `${turn.failedTools} failed` : null, turn.files.length ? `${count(turn.files.length, "file")} changed` : null].filter(Boolean).join(" · ");

/** A work thread's turns as a timeline: who asked for each and what, then how it went and what it did. */
export function ChatThreadTimeline({ turns, botName, featuredRunId }: ChatThreadTimelineProps) {
  return <ol aria-label="Thread activity" className="relative before:absolute before:bottom-2 before:left-[7.5px] before:top-2 before:w-px before:bg-border">
    {turns.flatMap((turn) => {
      const { outcome } = turn;
      const work = workDone(turn);
      const reply = turn.reply && turn.runId !== featuredRunId ? turn.reply.text : null;
      return [
        <Step key={`${turn.runId}:asked`} icon={turn.request.from === "you" ? MessageSquare : CornerDownRight} at={turn.at}
          detail={<p className="mt-0.5 line-clamp-2 break-words text-xs text-muted-foreground" title={turn.request.text}>{turn.request.text}</p>}>
          <span className="font-medium">{turn.request.from === "you" ? "You" : "The chat"}</span>
          <span className="text-muted-foreground"> {turn.request.from === "you" ? "asked" : "passed on"}</span></Step>,
        <Step key={`${turn.runId}:outcome`} icon={OUTCOME_ICONS[outcome.kind]} iconClass={OUTCOME_COLORS[outcome.kind]} spin={outcome.kind === "working"} at={turn.endedAt}
          detail={<>
            {work && <p className="mt-0.5 text-xs text-muted-foreground" title={turn.files.join("\n") || undefined}>{work}</p>}
            {outcome.kind === "failed" && outcome.detail && <p className="mt-0.5 break-words text-xs text-destructive">{outcome.detail}</p>}
            {reply && <p className="mt-0.5 line-clamp-2 break-words text-xs text-muted-foreground" title={reply}><span className="font-medium text-foreground">{botName}: </span>{reply}</p>}
          </>}>
          <span className={outcome.kind === "done" || outcome.kind === "queued" ? "text-muted-foreground" : "font-medium"}>{outcome.label}</span></Step>
      ];
    })}
  </ol>;
}
