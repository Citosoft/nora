import { noraToolingClient } from "@/components/app/clients/noraToolingClient";
import { formatTimestamp, statusVariant } from "@/components/app/logic/utils";
import { resolveWorkspaceProjectIconMode, shouldInvertFrameworkLogoInDarkMode } from "@/components/app/logic/workspaceProjectIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { isAgentToolAvailable } from "@shared/agentToolState";
import type { AgentCatalogEntry, ToolUsageInfo, WorkspaceFramework } from "@shared/appTypes";
import { FolderGit2, Wrench, X } from "lucide-react";
import type { MouseEvent } from "react";
import { forwardRef, useEffect, useState } from "react";

export function toolLogoUrl(toolId: string): string {
  const domainByTool: Record<string, string> = {
    codex: "openai.com",
    claude: "anthropic.com",
    gemini: "gemini.google.com",
    cursor: "cursor.com"
  };

  const domain = domainByTool[toolId] ?? "example.com";
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

export function AgentToolIcon({
  toolId,
  label,
  className,
  imageClassName
}: {
  toolId: string;
  label: string;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <div className={cn("grid place-items-center overflow-hidden rounded-[4px] bg-background/60", className)}>
      <img
        src={toolLogoUrl(toolId)}
        alt=""
        className={cn("object-contain", imageClassName)}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function FrameworkIcon({
  framework,
  className,
  imageClassName,
  tooltipContent
}: {
  framework: WorkspaceFramework;
  className?: string;
  imageClassName?: string;
  tooltipContent?: string | null;
}) {
  const [frameworkLogoFailed, setFrameworkLogoFailed] = useState(false);

  useEffect(() => {
    setFrameworkLogoFailed(false);
  }, [framework.logoUrl]);

  const iconMode = resolveWorkspaceProjectIconMode({
    projectFaviconUrl: null,
    projectFaviconFailed: true,
    frameworkLogoUrl: framework.logoUrl,
    frameworkLogoFailed
  });

  const icon = (
    <div className={cn("grid place-items-center overflow-hidden rounded-[4px] bg-background/60", className)}>
      {iconMode === "framework-logo" ? (
        <img
          src={framework.logoUrl}
          alt=""
          className={cn(
            "object-contain",
            shouldInvertFrameworkLogoInDarkMode(framework.id) && "framework-logo-nextjs-invert-dark",
            imageClassName
          )}
          aria-hidden="true"
          onError={() => setFrameworkLogoFailed(true)}
        />
      ) : (
        <FolderGit2 className={cn("text-muted-foreground", imageClassName)} aria-hidden="true" />
      )}
      <span className="sr-only">{framework.label}</span>
    </div>
  );

  if (tooltipContent === null) {
    return icon;
  }

  return (
    <Tooltip content={tooltipContent ?? framework.label}>
      {icon}
    </Tooltip>
  );
}

export function WorkspaceProjectIcon({
  framework,
  projectFaviconUrl,
  label,
  className,
  imageClassName,
  fallbackIconClassName,
  frameworkTooltipContent
}: {
  framework: WorkspaceFramework | null;
  projectFaviconUrl?: string | null;
  label: string;
  className?: string;
  imageClassName?: string;
  fallbackIconClassName?: string;
  frameworkTooltipContent?: string | null;
}) {
  const [projectFaviconFailed, setProjectFaviconFailed] = useState(false);
  const [frameworkLogoFailed, setFrameworkLogoFailed] = useState(false);
  const normalizedFaviconUrl = projectFaviconUrl?.trim() || null;
  const frameworkLogoUrl = framework?.logoUrl ?? null;

  useEffect(() => {
    setProjectFaviconFailed(false);
  }, [normalizedFaviconUrl]);

  useEffect(() => {
    setFrameworkLogoFailed(false);
  }, [frameworkLogoUrl]);

  const iconMode = resolveWorkspaceProjectIconMode({
    projectFaviconUrl: normalizedFaviconUrl,
    projectFaviconFailed,
    frameworkLogoUrl,
    frameworkLogoFailed
  });

  if (iconMode === "project-favicon" && normalizedFaviconUrl) {
    return (
      <div className={cn("grid place-items-center overflow-hidden rounded-[4px] bg-background/60", className)}>
        <img
          src={normalizedFaviconUrl}
          alt=""
          className={cn("object-contain", imageClassName)}
          aria-hidden="true"
          onError={() => setProjectFaviconFailed(true)}
        />
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  if (iconMode === "framework-logo" && framework && frameworkLogoUrl) {
    const icon = (
      <div className={cn("grid place-items-center overflow-hidden rounded-[4px] bg-background/60", className)}>
        <img
          src={frameworkLogoUrl}
          alt=""
          className={cn(
            "object-contain",
            shouldInvertFrameworkLogoInDarkMode(framework.id) && "framework-logo-nextjs-invert-dark",
            imageClassName
          )}
          aria-hidden="true"
          onError={() => setFrameworkLogoFailed(true)}
        />
        <span className="sr-only">{framework.label}</span>
      </div>
    );

    if (frameworkTooltipContent === null) {
      return icon;
    }

    return (
      <Tooltip content={frameworkTooltipContent ?? framework.label}>
        {icon}
      </Tooltip>
    );
  }

  return (
    <div className={cn("grid place-items-center overflow-hidden rounded-[4px] bg-background/60", className)}>
      <FolderGit2 className={cn("text-muted-foreground", fallbackIconClassName ?? imageClassName)} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function ToolListItem({
  tool,
  active,
  onClick
}: {
  tool: AgentCatalogEntry;
  active: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-3 rounded-[4px] px-3 py-2 text-left transition",
        active ? "bg-primary/10 text-foreground" : "hover:bg-accent/50"
      )}
      onClick={onClick}
    >
      <AgentToolIcon toolId={tool.id} label={tool.label} className="size-8" imageClassName="size-5 rounded-sm" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{tool.label}</div>
      </div>
      <div
        className={cn(
          "size-2.5 rounded-full",
          isAgentToolAvailable(tool) ? "bg-emerald-400" : tool.detected ? "bg-amber-400" : "bg-slate-500"
        )}
      />
    </button>
  );
}

export const ToolPopover = forwardRef<HTMLDivElement, {
  tool: AgentCatalogEntry;
  draftValue: string;
  top: number;
  left: number;
  onClose: () => void;
  onInstallDraftChange: (toolId: string, value: string) => void;
  onInstallTool: (toolId: string) => void;
  onRemoveTool: (toolId: string) => void;
  allowRemoval?: boolean;
  centered?: boolean;
}>(function ToolPopover({
  tool,
  draftValue,
  top,
  left,
  onClose,
  onInstallDraftChange,
  onInstallTool,
  onRemoveTool,
  allowRemoval = true,
  centered = false
}, ref) {
  const [usageInfo, setUsageInfo] = useState<ToolUsageInfo | null>(null);
  const [usageStatus, setUsageStatus] = useState<"idle" | "loading">("idle");

  useEffect(() => {
    let cancelled = false;
    setUsageStatus("loading");

    noraToolingClient.getToolUsage(tool.id).then((nextUsage) => {
      if (!cancelled) {
        setUsageInfo(nextUsage);
        setUsageStatus("idle");
      }
    }).catch((error: unknown) => {
      if (!cancelled) {
        setUsageInfo({
          status: "error",
          title: "Usage Lookup Failed",
          lines: [error instanceof Error ? error.message : "Unknown error"],
          fetchedAt: new Date().toISOString()
        });
        setUsageStatus("idle");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [tool]);

  return (
    <div
      ref={ref}
      className="fixed z-[60] max-h-[min(88vh,860px)] w-[min(92vw,980px)] overflow-auto rounded-[4px] border border-border/70 bg-popover/95 p-4 shadow-2xl backdrop-blur"
      style={centered ? {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)"
      } : { top, left }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid size-10 place-items-center overflow-hidden rounded-[4px] bg-background/70">
            <img
              src={toolLogoUrl(tool.id)}
              alt=""
              className="size-6 rounded-[4px]"
            />
          </div>
          <div>
            <div className="font-medium">{tool.label}</div>
            <div className="mt-1 text-sm text-muted-foreground">{tool.description}</div>
          </div>
        </div>
        <button
          type="button"
          className="rounded-[4px] p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
          onClick={onClose}
          aria-label="Close agent details"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Badge variant={statusVariant(isAgentToolAvailable(tool) ? "available" : tool.detected ? "idle" : "missing")}>
          {tool.detected ? (tool.enabled ? "Installed" : "Disabled") : "Not installed"}
        </Badge>
        <div className="text-xs text-muted-foreground">
          {tool.detectedPath ? tool.detectedPath : `Aliases: ${tool.aliases.join(", ")}`}
        </div>
      </div>

      {tool.usageNotes.length ? (
        <div className="mt-4 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Usage</div>
          <div className="space-y-2 text-sm text-muted-foreground">
            {tool.usageNotes.map((note) => (
              <div key={note}>{note}</div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Usage</div>
          {usageStatus === "loading" ? (
            <div className="text-xs text-muted-foreground">Loading...</div>
          ) : null}
        </div>
        {usageInfo ? (
          <div className="rounded-[4px] border border-border/60 bg-background/35 p-3">
            <div className="font-medium">{usageInfo.title}</div>
            {usageInfo.rawOutput ? (
              <TerminalTranscript output={usageInfo.rawOutput} />
            ) : (
              <div className="mt-2 max-h-56 overflow-auto rounded-[4px] border border-border/40 bg-background/30 p-2 text-sm text-muted-foreground">
                <div className="space-y-1">
                  {usageInfo.lines.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-2 text-xs text-muted-foreground">
              Updated {formatTimestamp(usageInfo.fetchedAt)}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            No CLI status output is currently available.
          </div>
        )}
      </div>

      {!tool.detected ? (
        <div className="mt-4 space-y-3">
          <Textarea
            value={draftValue}
            onChange={(event) => onInstallDraftChange(tool.id, event.target.value)}
            placeholder="Enter an install command"
            className="min-h-[88px]"
          />
          <Button
            type="button"
            variant="outline"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onInstallTool(tool.id);
            }}
            disabled={tool.installStatus === "running"}
          >
            <Wrench className="size-4" />
            {tool.installStatus === "running" ? "Installing..." : "Install"}
          </Button>
        </div>
      ) : allowRemoval ? (
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onRemoveTool(tool.id);
            }}
            disabled={tool.installStatus === "running"}
          >
            <X className="size-4" />
            {tool.installStatus === "running" ? "Removing..." : "Remove"}
          </Button>
        </div>
      ) : null}

      {tool.detected && !allowRemoval ? (
        <div className="mt-4 rounded-[4px] border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-foreground">
          Installed. You can enable or disable this CLI from onboarding.
        </div>
      ) : null}

      {tool.installLog.length ? (
        <pre className="terminal-text mt-4 max-h-44 overflow-auto rounded-[4px] border border-border/60 bg-black/30 p-3 text-xs leading-6 text-muted-foreground">
          {tool.installLog.join("\n")}
        </pre>
      ) : null}
    </div>
  );
});

function TerminalTranscript({ output }: { output: string }) {
  const cleaned = output
    .replace(/\x1B\][^\u0007]*(?:\u0007|\x1B\\)/g, "")
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  return (
    <div className="mt-2 max-h-[28rem] overflow-auto rounded-[4px] border border-border/40 bg-black/85 p-2">
      <pre className="terminal-text w-max min-w-full whitespace-pre text-xs leading-5 text-slate-200">
        {cleaned}
      </pre>
    </div>
  );
}
