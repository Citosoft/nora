import { getCurrentBrowserUrl } from "@/components/app/logic/browserTabs";
import { rememberTerminalShell } from "@/components/app/logic/terminalShellPreferences";
import { statusVariant } from "@/components/app/logic/utils";
import { createScriptTerminalDefaults, formatWorkspaceScriptActionLabel } from "@/components/app/logic/workspaceScripts";
import type { FocusedAgentWorkspaceHomeProps } from "@/components/app/types/focusedAgentEmptyState.types";
import { AgentToolIcon, WorkspaceProjectIcon } from "@/components/app/shared/Tooling";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Select } from "@/components/ui/select";
import { Bot, ChevronDown, ChevronRight, FileText, FolderGit2, Globe, LoaderCircle, MessageSquare, Plus, RotateCcw, Sparkles, TerminalSquare, Wrench } from "lucide-react";

export const FocusedAgentWorkspaceHome = (props: FocusedAgentWorkspaceHomeProps) => {
  const {
    workspace,
    workspaceProjectFaviconUrl,
    workspaceSwitcherShortcutLabel,
    activeSessionCount,
    workspaceBrowserTabs,
    activePorts,
    detectedTools,
    scripts,
    terminalShells,
    launchShellId,
    defaultShellId,
    isDirectSshWorkspace,
    directSshHost,
    tools,
    isRefreshingRemoteTools,
    showRemoteToolDiagnostics,
    onToggleRemoteToolDiagnostics,
    onRedetectRemoteClis,
    onShellSelectChange,
    onMakeDefaultShell,
    onClearDefaultShell,
    launchBlankTerminal,
    onOpenWorkspaceSwitcher,
    onOpenTaskBoard,
    onOpenSpecBrowser,
    onOpenNoteBrowser,
    onFocusAgent,
    onFocusTerminal,
    onFocusBrowserTab,
    onOpenWorkspaceBrowser,
    onCreateInWorkspace,
    onOpenAiChat,
    onOpenWorkspaceTerminalPresets,
    onOpenCreateTerminal
  } = props;

  return (
    <>
      <div className="w-full max-w-4xl space-y-3 text-left">
        <div className="flex flex-wrap items-center gap-3">
          <WorkspaceProjectIcon
            framework={workspace.project.framework}
            projectFaviconUrl={workspaceProjectFaviconUrl}
            label={workspace.project.name}
            className="size-7"
            imageClassName="size-5"
          />
          <div className="min-w-0">
            <div className="truncate text-2xl font-semibold text-foreground">{workspace.project.name}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {workspace.project.framework ? (
                <Badge variant="outline" className="text-[10px] uppercase tracking-[0.12em]">
                  {workspace.project.framework.label}
                  {workspace.project.framework.version ? ` ${workspace.project.framework.version}` : ""}
                </Badge>
              ) : null}
              {workspace.project.location?.kind === "ssh" ? (
                <Badge variant="outline" className="text-[10px] uppercase tracking-[0.12em]">
                  {workspace.project.location.user}@{workspace.project.location.host}
                  {workspace.project.location.port ? `:${workspace.project.location.port}` : ""}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
        <div className="truncate text-sm text-muted-foreground">{workspace.project.rootPath}</div>
      </div>
      <div className="space-y-2">
        <div className="text-lg font-medium text-foreground">No session selected</div>
        <div>Open an agent, start a script terminal, or launch a blank terminal in this workspace.</div>
      </div>
      <div className="grid gap-4 text-left lg:grid-cols-2 lg:items-start">
        <div className="rounded-[4px] border border-border/70 bg-background/30 p-4 text-left lg:col-start-2 lg:row-span-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-medium text-foreground">Workspace quick access</div>
            <div className="text-xs text-muted-foreground">{workspace.project.name}</div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onOpenWorkspaceSwitcher}>
              <FolderGit2 className="size-4" />
              {workspaceSwitcherShortcutLabel ? `Workspace switcher (${workspaceSwitcherShortcutLabel})` : "Workspace switcher"}
            </Button>
            <Button variant="outline" size="sm" onClick={onOpenTaskBoard}>
              <FileText className="size-4" />
              Task center
            </Button>
            <Button variant="outline" size="sm" onClick={onOpenSpecBrowser}>
              <Sparkles className="size-4" />
              Spec center
            </Button>
            <Button variant="outline" size="sm" onClick={onOpenNoteBrowser}>
              <FileText className="size-4" />
              Note center
            </Button>
          </div>
          <div className="mt-3 border-t border-border/60 pt-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-sm font-medium text-foreground">Active sessions</div>
              <div className="text-xs text-muted-foreground">{activeSessionCount} total</div>
            </div>
            {activeSessionCount ? (
              <div className="space-y-1.5">
                {workspace.agents.map((entry) => (
                  <button
                    key={`agent:${entry.id}`}
                    type="button"
                    onClick={() => onFocusAgent(entry.id)}
                    className="flex w-full items-center gap-2 rounded-[4px] border border-border/60 bg-background/40 px-2 py-1.5 text-left transition hover:bg-accent/40"
                  >
                    <Bot className="size-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-foreground">{entry.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{entry.toolLabel}</div>
                    </div>
                    <Badge variant={statusVariant(entry.status)} className="shrink-0 text-[10px]">
                      {entry.status}
                    </Badge>
                  </button>
                ))}
                {workspace.terminals.map((entry) => (
                  <button
                    key={`terminal:${entry.id}`}
                    type="button"
                    onClick={() => onFocusTerminal(entry.id)}
                    className="flex w-full items-center gap-2 rounded-[4px] border border-border/60 bg-background/40 px-2 py-1.5 text-left transition hover:bg-accent/40"
                  >
                    <TerminalSquare className="size-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-foreground">{entry.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{entry.shellLabel}</div>
                    </div>
                    <Badge variant={statusVariant(entry.status)} className="shrink-0 text-[10px]">
                      {entry.status}
                    </Badge>
                  </button>
                ))}
                {workspaceBrowserTabs.map((entry) => (
                  <button
                    key={`browser:${entry.id}`}
                    type="button"
                    onClick={() => onFocusBrowserTab(entry.id)}
                    className="flex w-full items-center gap-2 rounded-[4px] border border-border/60 bg-background/40 px-2 py-1.5 text-left transition hover:bg-accent/40"
                    title={getCurrentBrowserUrl(entry)}
                  >
                    <Globe className="size-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-foreground">{entry.title}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{getCurrentBrowserUrl(entry)}</div>
                    </div>
                    <Badge variant={statusVariant(entry.status)} className="shrink-0 text-[10px]">
                      {entry.status}
                    </Badge>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-[4px] border border-dashed border-border/70 bg-background/20 px-3 py-2 text-xs text-muted-foreground">
                No active sessions in this workspace.
              </div>
            )}
          </div>
          <div className="mt-3 border-t border-border/60 pt-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-sm font-medium text-foreground">Active local ports</div>
              <div className="text-xs text-muted-foreground">{activePorts.length} detected</div>
            </div>
            {activePorts.length ? (
              <div className="space-y-1.5">
                {activePorts.slice(0, 6).map((entry) => (
                  <div
                    key={`${entry.projectId}:${entry.terminalId}:${entry.port}`}
                    className="flex items-center gap-2 rounded-[4px] border border-border/60 bg-background/40 px-2 py-1.5"
                  >
                    <div className="rounded-[4px] border border-border/60 bg-background/60 px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                      :{entry.port}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-foreground">{entry.terminalName}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{workspace.project.name}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => onOpenWorkspaceBrowser(entry.projectId, entry.url)}
                      aria-label={`Open ${entry.url}`}
                    >
                      <Globe className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[4px] border border-dashed border-border/70 bg-background/20 px-3 py-2 text-xs text-muted-foreground">
                No active local ports in this workspace.
              </div>
            )}
          </div>
        </div>
        {isDirectSshWorkspace ? (
          <div className="rounded-[4px] border border-border/70 bg-background/30 p-4 text-left lg:col-start-1">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-foreground">Remote agent CLIs</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Recheck which agent CLIs are installed on {directSshHost}.
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Detection runs over SSH with `BatchMode=yes` and probes each CLI using the command shown below.
                </div>
              </div>
              <Button variant="outline" disabled={isRefreshingRemoteTools} onClick={onRedetectRemoteClis}>
                {isRefreshingRemoteTools ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                {isRefreshingRemoteTools ? "Detecting remote CLIs..." : "Redetect agent CLIs"}
              </Button>
            </div>
            <div className="mt-4">
              <Button variant="outline" size="sm" className="h-8 px-2" onClick={onToggleRemoteToolDiagnostics}>
                {showRemoteToolDiagnostics ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                {showRemoteToolDiagnostics ? "Hide detection details" : "Show detection details"}
              </Button>
            </div>
            {showRemoteToolDiagnostics ? (
              <div className="mt-4 space-y-2">
                {tools.map((tool) => (
                  <div key={tool.id} className="rounded-[4px] border border-border/60 bg-background/60 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-foreground">{tool.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {tool.detected ? tool.detectedPath || "Detected" : "Not detected"}
                      </div>
                    </div>
                    <div className="mt-2 overflow-x-auto rounded-[3px] bg-black/70 px-2 py-1 font-mono text-[11px] text-zinc-100">
                      {tool.detectionProbe || "No probe recorded."}
                    </div>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">stdout</div>
                        <div className="mt-1 overflow-x-auto rounded-[3px] bg-black/70 px-2 py-1 font-mono text-[11px] text-zinc-100">
                          {tool.detectionStdout || "(empty)"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">stderr</div>
                        <div className="mt-1 overflow-x-auto rounded-[3px] bg-black/70 px-2 py-1 font-mono text-[11px] text-zinc-100">
                          {tool.detectionStderr || "(empty)"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-3 lg:col-start-1">
          <DropdownMenu
            align="start"
            widthClassName="w-56"
            trigger={(
              <Button variant="outline">
                <Plus className="size-4" />
                New agent
              </Button>
            )}
          >
            {detectedTools.length ? (
              detectedTools.map((tool) => (
                <DropdownMenuItem
                  key={tool.id}
                  onSelect={() =>
                    onCreateInWorkspace({
                      toolId: tool.id
                    })
                  }
                >
                  <AgentToolIcon
                    toolId={tool.id}
                    label={tool.label}
                    className="size-4 shrink-0 rounded-sm bg-transparent"
                    imageClassName="size-4 rounded-sm"
                  />
                  New {tool.label} agent
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem onSelect={() => {}}>
                <Bot className="size-4" />
                No agent CLIs available
              </DropdownMenuItem>
            )}
          </DropdownMenu>
          <Button variant="outline" onClick={() => onOpenAiChat(workspace.project.id)}>
            <MessageSquare className="size-4" />
            New AI chat
          </Button>
          <Button variant="outline" onClick={launchBlankTerminal} disabled={!launchShellId}>
            <TerminalSquare className="size-4" />
            Open blank terminal
          </Button>
          <Button variant="outline" onClick={() => onOpenWorkspaceBrowser(workspace.project.id)}>
            <Globe className="size-4" />
            Open browser
          </Button>
          <Button variant="outline" onClick={() => onOpenWorkspaceTerminalPresets(workspace.project.id)}>
            <Wrench className="size-4" />
            Workspace presets
          </Button>
          {scripts.length ? (
            <DropdownMenu
              align="start"
              widthClassName="w-64"
              trigger={(
                <Button variant="outline" disabled={!launchShellId}>
                  <TerminalSquare className="size-4" />
                  Run script
                </Button>
              )}
            >
              {scripts.map((script) => (
                <DropdownMenuItem
                  key={script.id}
                  onSelect={() => {
                    if (!launchShellId) {
                      return;
                    }
                    rememberTerminalShell(launchShellId);
                    onOpenCreateTerminal(createScriptTerminalDefaults(script, launchShellId));
                  }}
                >
                  <TerminalSquare className="size-4" />
                  <span>{formatWorkspaceScriptActionLabel(script)}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenu>
          ) : null}
        </div>
        {terminalShells.length ? (
          <div className="rounded-[4px] border border-border/70 bg-background/30 p-4 text-left lg:col-start-1">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-foreground">Terminal shell</div>
                <div className="mt-1 text-xs text-muted-foreground">New terminals and script launches will use this shell.</div>
              </div>
              <div className="shrink-0 text-xs text-muted-foreground">
                {defaultShellId && defaultShellId === launchShellId ? "Default shell" : "Last used shell"}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Select
                value={launchShellId || ""}
                onChange={(event) => {
                  const nextShellId = event.target.value || null;
                  onShellSelectChange(nextShellId);
                }}
              >
                {terminalShells.map((shell) => (
                  <option key={shell.id} value={shell.id}>
                    {shell.label}
                  </option>
                ))}
              </Select>
              <Button variant="outline" disabled={!launchShellId} onClick={onMakeDefaultShell}>
                Make default
              </Button>
              {defaultShellId ? (
                <Button variant="outline" onClick={onClearDefaultShell}>
                  Clear default
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
};
