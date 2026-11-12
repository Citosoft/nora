import { ChevronRight } from "lucide-react";
import type { ThreadAvailableSkillsProps } from "@/components/app/types/threadSkills.types";

const scopeLabels = { user: "User", workspace: "Workspace", plugin: "Plugin", system: "Built-in", unknown: "" } as const;

/** Skills the runtime offers that the thread has not used, collapsed because the list can be long. */
export function ThreadAvailableSkills({ skills }: ThreadAvailableSkillsProps) {
  return <details className="group/available">
    <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md py-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
      <ChevronRight className="size-3 shrink-0 transition-transform group-open/available:rotate-90" aria-hidden="true" />
      {skills.length} available, not used
    </summary>
    <ul className="thin-scrollbar max-h-52 space-y-1 overflow-y-auto pl-4 pt-1" aria-label="Available skills">{skills.map((skill) => {
      const scope = skill.scope === "plugin" && skill.plugin ? skill.plugin : scopeLabels[skill.scope];
      return <li key={`${skill.scope}:${skill.plugin ?? ""}:${skill.name}`} className="min-w-0">
        <p className="flex min-w-0 items-center gap-1.5"><span className="truncate" title={skill.name}>{skill.name}</span>
          {scope && <span className="shrink-0 rounded bg-muted px-1 text-[10px] text-muted-foreground">{scope}</span>}</p>
        {skill.description && <p className="line-clamp-2 text-[10px] leading-relaxed text-muted-foreground" title={skill.description}>{skill.description}</p>}
      </li>;
    })}</ul>
  </details>;
}
