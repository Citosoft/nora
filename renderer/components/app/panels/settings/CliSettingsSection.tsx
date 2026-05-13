import { useSettingsRuntime } from "@/components/app/hooks/useSettingsRuntime";
import { createAgentSkillCatalogMap } from "@/components/app/logic/agentSkills";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { isAgentToolAvailable } from "@shared/agentToolState";
import { Bot, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

export function CliSettingsSection() {
  const {
    agentCatalog,
    agentSkillCatalogs,
    appSettings,
    updatePreferredAgentToolId,
    toggleToolEnabled,
    refreshAgentCatalog,
    removeToolSkill
  } = useSettingsRuntime();
  const detectedTools = agentCatalog.filter((tool) => tool.detected);
  const availableDetectedTools = useMemo(
    () => detectedTools.filter((tool) => isAgentToolAvailable(tool)),
    [detectedTools]
  );
  const selectedPreferredAgentToolId = useMemo(
    () =>
      appSettings.preferredAgentToolId && availableDetectedTools.some((tool) => tool.id === appSettings.preferredAgentToolId)
        ? appSettings.preferredAgentToolId
        : "",
    [appSettings.preferredAgentToolId, availableDetectedTools]
  );
  const [expandedToolIds, setExpandedToolIds] = useState<Set<string>>(new Set());
  const skillCatalogByToolId = useMemo(
    () => createAgentSkillCatalogMap(agentSkillCatalogs),
    [agentSkillCatalogs]
  );
  const toggleExpanded = (toolId: string): void => {
    setExpandedToolIds((current) => {
      const next = new Set(current);
      if (next.has(toolId)) {
        next.delete(toolId);
      } else {
        next.add(toolId);
      }
      return next;
    });
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-foreground">
            <Bot className="size-5" aria-hidden="true" />
            <div className="text-xl font-semibold">Agents</div>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Review detected agent CLIs, choose which ones can appear in launch surfaces, and inspect each CLI-specific skill directory.
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refreshAgentCatalog}>
          Refresh detection
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        <div className="rounded-[6px] border border-border/60 bg-card/40 px-4 py-4">
          <div className="mb-2 text-sm font-medium text-foreground">Preferred Agent CLI</div>
          <div className="mb-3 text-sm text-muted-foreground">
            Choose which detected CLI Nora should preselect by default in the New Agent dialog.
          </div>
          <DropdownMenu
            align="start"
            widthClassName="w-[280px]"
            trigger={(
              <button
                type="button"
                className="flex h-10 w-full items-center justify-between rounded-[5px] border border-input bg-background px-3 py-2 text-sm ring-offset-background transition hover:bg-accent/40"
                aria-label="Choose preferred agent CLI"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {selectedPreferredAgentToolId ? (
                    <AgentToolIcon
                      toolId={selectedPreferredAgentToolId}
                      label={availableDetectedTools.find((tool) => tool.id === selectedPreferredAgentToolId)?.label || "Preferred CLI"}
                      className="size-4 shrink-0 rounded-sm"
                      imageClassName="size-3 rounded-sm"
                    />
                  ) : (
                    <Bot className="size-4 text-primary" />
                  )}
                  <span className="truncate">
                    {selectedPreferredAgentToolId
                      ? (availableDetectedTools.find((tool) => tool.id === selectedPreferredAgentToolId)?.label || "Preferred CLI")
                      : "Automatic (first detected)"}
                  </span>
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
              </button>
            )}
          >
            <DropdownMenuItem onSelect={() => updatePreferredAgentToolId(null)}>
              <Bot className="size-4 text-primary" />
              <span className="truncate">Automatic (first detected)</span>
              {!selectedPreferredAgentToolId ? (
                <span className="ml-auto rounded-[4px] bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
                  Current
                </span>
              ) : null}
            </DropdownMenuItem>
            {availableDetectedTools.map((tool) => (
              <DropdownMenuItem key={tool.id} onSelect={() => updatePreferredAgentToolId(tool.id)}>
                <AgentToolIcon
                  toolId={tool.id}
                  label={tool.label}
                  className="size-4 shrink-0 rounded-sm"
                  imageClassName="size-3 rounded-sm"
                />
                <span className="truncate">{tool.label}</span>
                {selectedPreferredAgentToolId === tool.id ? (
                  <span className="ml-auto rounded-[4px] bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
                    Current
                  </span>
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenu>
        </div>
        {agentCatalog.map((tool) => {
          const skillCatalog = skillCatalogByToolId.get(tool.id) || null;
          const statusLabel = !tool.detected
            ? "Not detected"
            : tool.enabled
              ? "Enabled"
              : "Disabled";
          const isExpanded = expandedToolIds.has(tool.id);

          return (
            <div
              key={tool.id}
              className="rounded-[6px] border border-border/60 bg-card/50 px-4 py-4"
            >
              <div className="flex items-start justify-between gap-4">
                <button
                  type="button"
                  onClick={() => toggleExpanded(tool.id)}
                  className="flex min-w-0 items-center gap-3 text-left"
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? "Collapse" : "Expand"} ${tool.label} details`}
                >
                  <AgentToolIcon
                    toolId={tool.id}
                    label={tool.label}
                    className="size-10 shrink-0"
                    imageClassName="size-6 rounded-[4px]"
                  />
                  <div className="min-w-0 font-medium text-foreground">{tool.label}</div>
                  <ChevronDown
                    className={["size-4 shrink-0 text-muted-foreground transition-transform", isExpanded ? "rotate-180" : ""].join(" ")}
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={tool.enabled}
                  disabled={!tool.detected}
                  onClick={() => toggleToolEnabled(tool.id, !tool.enabled)}
                  className={[
                    "flex w-[124px] shrink-0 items-center justify-between rounded-[4px] border px-3 py-2 text-left transition",
                    tool.detected
                      ? tool.enabled
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-border/70 bg-background/50 text-muted-foreground hover:border-primary/25 hover:text-foreground"
                      : "cursor-not-allowed border-border/50 bg-muted/30 text-muted-foreground/70"
                  ].join(" ")}
                >
                  <span className="text-sm">{tool.enabled ? "Enabled" : "Disabled"}</span>
                  <span
                    className={[
                      "relative inline-flex h-5 w-9 shrink-0 rounded-full transition",
                      tool.detected ? (tool.enabled ? "bg-primary" : "bg-muted") : "bg-muted/60"
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "absolute top-0.5 size-4 rounded-full bg-white transition",
                        tool.enabled ? "left-[18px]" : "left-0.5"
                      ].join(" ")}
                    />
                  </span>
                </button>
              </div>

              {isExpanded ? (
                <div className="mt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={[
                        "rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-[0.12em]",
                        !tool.detected
                          ? "border-slate-500/40 bg-slate-500/10 text-slate-500 dark:text-slate-300"
                          : tool.enabled
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      ].join(" ")}
                    >
                      {statusLabel}
                    </span>
                    <span className="text-xs text-muted-foreground">{tool.detectedPath || `Aliases: ${tool.aliases.join(", ")}`}</span>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">{tool.description}</div>

                  {skillCatalog?.supported ? (
                    <div className="mt-4 rounded-[4px] border border-border/60 bg-background/35 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {skillCatalog.sourceLabel || "Global skills"}
                      </div>
                      <div className="mt-1 break-all text-sm text-foreground">
                        {skillCatalog.rootPath || "No skill root configured"}
                      </div>
                      {skillCatalog.installHint ? (
                        <div className="mt-1 text-xs text-muted-foreground">{skillCatalog.installHint}</div>
                      ) : null}
                      {skillCatalog.errorMessage ? (
                        <div className="mt-2 text-xs text-destructive">{skillCatalog.errorMessage}</div>
                      ) : null}

                      <div className="mt-4">
                        {skillCatalog.skills.length ? (
                          <div className="space-y-2">
                            {skillCatalog.skills.map((skill) => (
                              <div
                                key={skill.id}
                                className="flex items-start justify-between gap-3 rounded-[4px] border border-border/50 bg-card/40 px-3 py-3"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className="font-medium text-foreground">{skill.name}</div>
                                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                                      Enabled
                                    </span>
                                  </div>
                                  {skill.description ? (
                                    <div className="mt-1 text-sm text-muted-foreground">{skill.description}</div>
                                  ) : null}
                                  <div className="mt-2 break-all text-xs text-muted-foreground">{skill.path}</div>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => removeToolSkill(tool.id, skill.id)}>
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No visible global skills are installed for this CLI.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-5 text-sm text-muted-foreground">
        {detectedTools.length
          ? `${detectedTools.filter((tool) => isAgentToolAvailable(tool)).length} of ${detectedTools.length} detected CLIs enabled`
          : "No supported agent CLIs are currently detected on this machine."}
      </div>
    </div>
  );
}
