import { LoaderCircle } from "lucide-react";
import type { IslandPhaseIndicatorProps } from "@/components/app/types/island.types";
import type { IslandPhase } from "@shared/types/island/island.types";

const PHASE_LABELS: Readonly<Record<IslandPhase, string>> = { waiting: "Needs you", running: "Working", queued: "Queued" };

/**
 * Where a piece of work stands: running work spins the same loader the thread sidebar shows; work waiting on the
 * user is an amber dot and queued work a grey one.
 */
export function IslandPhaseIndicator({ phase, size }: IslandPhaseIndicatorProps) {
  return <span role="img" aria-label={PHASE_LABELS[phase]} className="grid shrink-0 place-items-center" style={{ width: size, height: size }}>
    {phase === "running"
      ? <LoaderCircle aria-hidden className="size-full text-white/60 motion-safe:animate-spin" />
      : <span aria-hidden className={`size-2 rounded-full ${phase === "waiting" ? "bg-amber-400" : "bg-zinc-500"}`} />}
  </span>;
}
