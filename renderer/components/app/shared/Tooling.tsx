import { noraToolingClient } from "@/components/app/clients/noraToolingClient";
import { formatInstallLogText, stripTerminalControlSequences } from "@/components/app/logic/terminalLogText";
import { formatTimestamp, statusVariant } from "@/components/app/logic/utils";
import { resolveWorkspaceProjectIconMode, shouldInvertFrameworkLogoInDarkMode } from "@/components/app/logic/workspaceProjectIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  SiAmp,
  SiClaude,
  SiCursor,
  SiGithubcopilot,
  SiGooglegemini,
  SiPerplexity,
  SiX
} from "@icons-pack/react-simple-icons";
import { isAgentToolAvailable } from "@shared/agentToolState";
import type { AgentCatalogEntry, ToolUsageInfo, WorkspaceFramework } from "@shared/appTypes";
import { FolderGit2, Wrench, X } from "lucide-react";
import type { ComponentType, MouseEvent, SVGProps } from "react";
import { forwardRef, useEffect, useState } from "react";

export function toolLogoUrl(toolId: string): string {
  const domainByTool: Record<string, string> = {
    codex: "openai.com",
    claude: "anthropic.com",
    gemini: "gemini.google.com",
    cursor: "cursor.com",
    aider: "aider.chat",
    goose: "goose-docs.ai",
    qwen: "qwenlm.github.io",
    opencode: "opencode.ai",
    copilot: "github.com",
    continue: "continue.dev",
    amp: "ampcode.com",
    crush: "charm.land",
    chatgpt: "chatgpt.com",
    perplexity: "perplexity.ai",
    grok: "grok.com",
    pi: "pi.dev",
    antigravity: "antigravity.google",
    kilo: "kilo.ai",
    kiro: "kiro.dev",
    aug: "augmentcode.com",
    autohand: "autohand.ai",
    cline: "cline.bot",
    codebuff: "codebuff.com",
    droid: "docs.factory.ai",
    kimi: "kimi.com",
    "mistral-vibe": "mistral.ai",
    rovo: "atlassian.com",
    hermes: "nousresearch.com",
    openclaw: "openclaw.ai"
  };

  const domain = domainByTool[toolId] ?? "example.com";
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

type LocalToolIconProps = SVGProps<SVGSVGElement> & {
  color?: string;
  size?: number | string;
};

interface LocalToolIconConfig {
  Icon: ComponentType<LocalToolIconProps>;
  color: "default" | "currentColor";
}

function CodexLocalIcon({ color = "currentColor", size = 24, ...props }: LocalToolIconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} fillRule="evenodd" {...props}>
      <title>Codex</title>
      <path
        clipRule="evenodd"
        d="M8.086.457a6.105 6.105 0 013.046-.415c1.333.153 2.521.72 3.564 1.7a.117.117 0 00.107.029c1.408-.346 2.762-.224 4.061.366l.063.03.154.076c1.357.703 2.33 1.77 2.918 3.198.278.679.418 1.388.421 2.126a5.655 5.655 0 01-.18 1.631.167.167 0 00.04.155 5.982 5.982 0 011.578 2.891c.385 1.901-.01 3.615-1.183 5.14l-.182.22a6.063 6.063 0 01-2.934 1.851.162.162 0 00-.108.102c-.255.736-.511 1.364-.987 1.992-1.199 1.582-2.962 2.462-4.948 2.451-1.583-.008-2.986-.587-4.21-1.736a.145.145 0 00-.14-.032c-.518.167-1.04.191-1.604.185a5.924 5.924 0 01-2.595-.622 6.058 6.058 0 01-2.146-1.781c-.203-.269-.404-.522-.551-.821a7.74 7.74 0 01-.495-1.283 6.11 6.11 0 01-.017-3.064.166.166 0 00.008-.074.115.115 0 00-.037-.064 5.958 5.958 0 01-1.38-2.202 5.196 5.196 0 01-.333-1.589 6.915 6.915 0 01.188-2.132c.45-1.484 1.309-2.648 2.577-3.493.282-.188.55-.334.802-.438.286-.12.573-.22.861-.304a.129.129 0 00.087-.087A6.016 6.016 0 015.635 2.31C6.315 1.464 7.132.846 8.086.457zm-.804 7.85a.848.848 0 00-1.473.842l1.694 2.965-1.688 2.848a.849.849 0 001.46.864l1.94-3.272a.849.849 0 00.007-.854l-1.94-3.393zm5.446 6.24a.849.849 0 000 1.695h4.848a.849.849 0 000-1.696h-4.848z"
      ></path>
    </svg>
  );
}

const localToolIconByToolId: Partial<Record<string, LocalToolIconConfig>> = {
  codex: { Icon: CodexLocalIcon, color: "currentColor" },
  claude: { Icon: SiClaude, color: "default" },
  gemini: { Icon: SiGooglegemini, color: "default" },
  cursor: { Icon: SiCursor, color: "currentColor" },
  copilot: { Icon: SiGithubcopilot, color: "currentColor" },
  amp: { Icon: SiAmp, color: "default" },
  perplexity: { Icon: SiPerplexity, color: "default" },
  grok: { Icon: SiX, color: "currentColor" }
};

export function hasLocalToolIcon(toolId: string): boolean {
  return Boolean(localToolIconByToolId[toolId]);
}

export function getLocalToolIconColor(toolId: string): LocalToolIconConfig["color"] | null {
  return localToolIconByToolId[toolId]?.color ?? null;
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
  const localIcon = localToolIconByToolId[toolId] ?? null;
  const LocalIcon = localIcon?.Icon ?? null;
  const localIconColor = localIcon?.color ?? "default";

  return (
    <div className={cn("grid place-items-center overflow-hidden rounded-[4px] bg-background/60", className)}>
      {LocalIcon ? (
        <LocalIcon
          color={localIconColor}
          className={cn("object-contain", localIconColor === "currentColor" && "text-foreground", imageClassName)}
          aria-hidden="true"
        />
      ) : (
        <img
          src={toolLogoUrl(toolId)}
          alt=""
          className={cn("object-contain", imageClassName)}
          aria-hidden="true"
        />
      )}
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
          <AgentToolIcon
            toolId={tool.id}
            label={tool.label}
            className="size-10 bg-background/70"
            imageClassName="size-6 rounded-[4px]"
          />
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
          {formatInstallLogText(tool.installLog)}
        </pre>
      ) : null}
    </div>
  );
});

function TerminalTranscript({ output }: { output: string }) {
  const cleaned = stripTerminalControlSequences(output)
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
