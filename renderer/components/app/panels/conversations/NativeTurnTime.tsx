import { Clock3 } from "lucide-react";
import { useTurnClock } from "@/components/app/hooks/useTurnClock";
import { formatTurnTime, isTurnTimerRunning, turnElapsedSeconds } from "@/components/app/logic/nativeTurnTime";
import type { NativeTurnTimeProps } from "@/components/app/types/nativeConversation.types";

export function NativeTurnTime({ run, startedAt }: NativeTurnTimeProps) {
  const running = isTurnTimerRunning(run.state);
  const now = useTurnClock(running);
  if (run.state === "queued") return null;
  return <p className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground" aria-label={running ? "Turn elapsed time" : "Turn duration"}>
    <Clock3 className="size-3" aria-hidden="true" />
    {running ? "Elapsed" : "Duration"} {formatTurnTime(turnElapsedSeconds(run, startedAt, now))}
  </p>;
}
