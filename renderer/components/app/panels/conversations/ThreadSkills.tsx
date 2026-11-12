import { LoaderCircle, RefreshCcw, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ThreadSkillsProps } from "@/components/app/types/threadSkills.types";
import { ThreadSkillRow } from "./ThreadSkillRow";
import { ThreadAvailableSkills } from "./ThreadAvailableSkills";

/** Skills the thread loaded or read, followed by the rest its runtime offers in this checkout. */
export function ThreadSkills({ skills }: ThreadSkillsProps) {
  const { catalog, used, available } = skills.summary;
  const counts = [used.length ? `${used.length} used` : "", catalog.status === "ready" ? `${catalog.skills.length} available` : ""].filter(Boolean).join(" · ");
  return <div className="space-y-2 border-t border-border/50 pt-3">
    <div className="flex items-center gap-1.5 font-medium"><ScrollText className="size-3.5" aria-hidden="true" />Skills
      {counts && <span className="font-normal tabular-nums text-muted-foreground">{counts}</span>}
      <Button variant="ghost" size="icon" className="ml-auto size-6" aria-label="Refresh thread skills" onClick={skills.refresh} disabled={catalog.status === "loading"}><RefreshCcw className="size-3" aria-hidden="true" /></Button>
    </div>
    <div className="space-y-1.5" aria-live="polite">
      {used.length > 0 && <ul className="space-y-0.5" aria-label="Skills used in this thread">{used.map((use) => <ThreadSkillRow key={use.name} use={use} />)}</ul>}
      {catalog.status === "loading" ? <p className="flex items-center gap-1.5 text-muted-foreground"><LoaderCircle className="size-3 motion-safe:animate-spin" aria-hidden="true" />Checking skills…</p>
        : catalog.status === "unavailable" ? <p className="text-muted-foreground">{catalog.message}</p>
        : available.length ? <ThreadAvailableSkills skills={available} />
        : !used.length && <p className="text-muted-foreground">No skills are available in this checkout.</p>}
    </div>
  </div>;
}
