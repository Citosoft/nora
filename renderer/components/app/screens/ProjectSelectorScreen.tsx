import { useAppMainCenterContent } from "@/components/app/context/appMainCenterContentContext";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { NORA_ASCII_3D } from "@/components/app/logic/asciiWordmark";
import { SHORTCUT_DEFINITIONS, formatShortcutKeyParts } from "@/components/app/logic/keyboardShortcuts";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isAgentToolAvailable } from "@shared/agentToolState";
import { FolderGit2, RefreshCcw } from "lucide-react";
import { useMemo } from "react";

export function ProjectSelectorScreen() {
  const snapshot = useCanonicalAppSnapshot();
  const { projectSelectorScreenProps } = useAppMainCenterContent();
  const {
    onChooseProject,
    onSelectRecent,
    onRefreshCatalog,
    installCommandDrafts: _installCommandDrafts,
    onInstallDraftChange: _onInstallDraftChange,
    onInstallTool: _onInstallTool,
    onRemoveTool: _onRemoveTool
  } = projectSelectorScreenProps;
  const availableTools = useMemo(
    () => snapshot?.agentCatalog.filter((tool) => isAgentToolAvailable(tool)) ?? [],
    [snapshot?.agentCatalog]
  );
  const availableCount = availableTools.length;
  const shortcutPlatform = typeof navigator !== "undefined" && navigator.platform.toLowerCase().includes("mac")
    ? "darwin"
    : "win32";
  const recentWorkspacePreview = useMemo(
    () => snapshot?.recentProjects.slice(0, 5) ?? [],
    [snapshot?.recentProjects]
  );
  const addWorkspaceShortcutParts = useMemo(() => {
    const addWorkspaceShortcut = SHORTCUT_DEFINITIONS.find((definition) => definition.id === "open-add-workspace");
    if (!addWorkspaceShortcut) {
      return [];
    }
    return formatShortcutKeyParts(addWorkspaceShortcut.keys, shortcutPlatform).map((part, index) => ({
      part,
      showPlus: index > 0 && shortcutPlatform !== "darwin"
    }));
  }, [shortcutPlatform]);
  const recentWorkspaceShortcutParts = useMemo(() => {
    return [1, 2, 3, 4, 5].map((position) => {
      const definition = SHORTCUT_DEFINITIONS.find((entry) => entry.id === `open-recent-workspace-${position}`);
      if (!definition) {
        return [];
      }
      return formatShortcutKeyParts(definition.keys, shortcutPlatform).map((part, index) => ({
        part,
        showPlus: index > 0 && shortcutPlatform !== "darwin"
      }));
    });
  }, [shortcutPlatform]);

  if (!snapshot) {
    return null;
  }

  return (
    <Card className="center-column-surface h-full min-h-0 rounded-none border-x-0 border-t-0 bg-card/95">
      <CardContent className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="space-y-2">
            <pre className="mx-auto w-fit overflow-x-auto p-1 text-left font-mono text-sm leading-tight text-foreground md:text-base">
              {NORA_ASCII_3D}
            </pre>
            <div>Open a repository once, then switch between workspaces and sessions from the left sidebar.</div>
          </div>
          <div className="flex justify-center">
            <Button variant="invisible" className="min-w-[220px] justify-between" onClick={onChooseProject}>
              <span className="inline-flex items-center gap-2">
                <FolderGit2 className="size-4" />
                Add workspace
              </span>
              {addWorkspaceShortcutParts.length ? (
                <span className="inline-flex items-center gap-1">
                  {addWorkspaceShortcutParts.map(({ part, showPlus }, index) => (
                    <span key={`${part}-${index}`} className="inline-flex items-center gap-1">
                      {showPlus ? <span className="text-[10px] text-muted-foreground">+</span> : null}
                      <span className="rounded-[4px] border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] leading-none text-foreground">
                        {part}
                      </span>
                    </span>
                  ))}
                </span>
              ) : null}
            </Button>
          </div>
          <div className="mx-auto w-full max-w-xl space-y-2 text-left">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Recent Workspaces
            </div>
            {recentWorkspacePreview.length ? (
              <div className="space-y-1.5">
                {recentWorkspacePreview.map((project, index) => (
                  <button
                    key={project.rootPath}
                    type="button"
                    className="w-full rounded-[4px] border border-border/60 bg-background/60 px-3 py-2.5 text-left transition hover:bg-accent/50"
                    onClick={() => onSelectRecent(project.rootPath)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{project.name}</div>
                      <span className="inline-flex items-center gap-1">
                        {(recentWorkspaceShortcutParts[index] ?? []).map(({ part, showPlus }, partIndex) => (
                          <span key={`${project.rootPath}-${part}-${partIndex}`} className="inline-flex items-center gap-1">
                            {showPlus ? <span className="text-[10px] text-muted-foreground">+</span> : null}
                            <span className="rounded-[4px] border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] leading-none text-foreground">
                              {part}
                            </span>
                          </span>
                        ))}
                      </span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{project.rootPath}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No recent workspaces yet.</div>
            )}
          </div>
          <div className="flex justify-center">
            <Button variant="outline" onClick={onRefreshCatalog}>
              <RefreshCcw className="size-4" />
              Refresh agent detection
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Detected {availableCount} available agent CLIs on this machine.
          </div>
          {availableTools.length ? (
            <div className="flex flex-wrap justify-center gap-2">
              {availableTools.map((tool) => (
                <div
                  key={tool.id}
                  className="inline-flex items-center gap-2 rounded-[8px] border border-border/60 bg-background/70 px-3 py-2"
                >
                  <AgentToolIcon
                    toolId={tool.id}
                    label={tool.label}
                    className="size-6 rounded-[4px]"
                    imageClassName="size-4 rounded-[4px]"
                  />
                  <span className="text-sm text-foreground">{tool.label}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
