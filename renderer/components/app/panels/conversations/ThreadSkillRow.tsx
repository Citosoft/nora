import { BookOpenCheck, ChevronRight, FileText } from "lucide-react";
import type { ThreadSkillRowProps } from "@/components/app/types/threadSkills.types";
import { NativeToolActivity } from "./NativeToolActivity";

/** A skill the thread used, expanding to who used it and the calls that loaded or read it. */
export function ThreadSkillRow({ use }: ThreadSkillRowProps) {
  const loaded = use.evidence === "loaded";
  const Icon = loaded ? BookOpenCheck : FileText;
  const status = loaded ? "Loaded" : "Read";
  return <li>
    <details className="group/skill rounded-md" aria-label={`${use.name}: ${status}`}>
      <summary className="flex cursor-pointer list-none items-start gap-2 rounded-md py-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <Icon className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate" title={use.name}>{use.name}</span>
          {use.skill?.description && <span className="block truncate text-[10px] text-muted-foreground" title={use.skill.description}>{use.skill.description}</span>}
        </span>
        <span className="shrink-0 text-[10px] text-muted-foreground" title={loaded ? "The runtime reported loading this skill." : "Its SKILL.md was read; the runtime does not report skill loads."}>
          {status}{use.calls.length > 1 && <span className="tabular-nums"> ×{use.calls.length}</span>}
        </span>
        <ChevronRight className="mt-0.5 size-3 shrink-0 text-muted-foreground transition-transform group-open/skill:rotate-90" aria-hidden="true" />
      </summary>
      <div className="space-y-2 pb-2 pl-5 pt-1.5">
        <p className="text-[10px] text-muted-foreground">{use.agents.length ? `Used by ${use.agents.join(", ")}` : "Used by this thread"}{!use.skill && " · no longer offered by the runtime"}</p>
        <div className="space-y-0.5" aria-label={`${use.name} calls`}>{use.calls.map((call) => <NativeToolActivity key={call.id} item={call} />)}</div>
      </div>
    </details>
  </li>;
}
