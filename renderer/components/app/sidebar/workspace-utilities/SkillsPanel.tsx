import { useMemo } from "react";
import { createAgentSkillCatalogMap, getAgentSkillCatalogSummaries } from "@/components/app/logic/agentSkills";
import { getEnabledUsageTools } from "@/components/app/logic/modelUsageTools";
import type { SkillsPanelProps } from "@/components/app/types/workspaceUtilities.types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SkillsPanel({ tools, agentSkillCatalogs, onOpenSkillsSettings, onClose }: SkillsPanelProps) {
  const visibleTools = useMemo(() => getEnabledUsageTools(tools), [tools]);
  const skillCatalogByToolId = useMemo(
    () => createAgentSkillCatalogMap(agentSkillCatalogs),
    [agentSkillCatalogs]
  );
  const skillCatalogSummaries = useMemo(
    () => getAgentSkillCatalogSummaries(visibleTools, skillCatalogByToolId),
    [visibleTools, skillCatalogByToolId]
  );
  const availableSkillCount = useMemo(
    () => skillCatalogSummaries.reduce((total, summary) => total + summary.catalog.skills.length, 0),
    [skillCatalogSummaries]
  );
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-foreground">Skills</div>
          <div className="text-xs text-muted-foreground">{availableSkillCount} installed</div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            onOpenSkillsSettings?.();
            onClose();
          }}
        >
          Open skills settings
        </Button>
      </div>
      {skillCatalogSummaries.length ? (
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {skillCatalogSummaries.map((summary) => (
            <div key={summary.toolId} className="rounded-[6px] border border-border/60 bg-background/50 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-sm font-medium text-foreground">{summary.label}</div>
                <div className="shrink-0 text-xs text-muted-foreground">{summary.catalog.skills.length}</div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {summary.catalog.skills.length ? (
                  summary.catalog.skills.map((skill) => (
                    <span
                      key={skill.id}
                      className={cn(
                        "max-w-full truncate rounded-[4px] border border-border/60",
                        "bg-background/70 px-2 py-0.5 text-xs text-foreground"
                      )}
                    >
                      {skill.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">No visible skills installed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[6px] border border-border/60 bg-background/50 px-3 py-2 text-sm text-muted-foreground">
          No supported skill catalogs are available for the detected agent setup.
        </div>
      )}
    </div>
  );
}
