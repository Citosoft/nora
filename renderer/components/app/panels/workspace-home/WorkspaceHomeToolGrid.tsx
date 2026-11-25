import { useState } from "react";
import { Pin, PinOff } from "lucide-react";
import { PixelTile } from "@/components/app/shared/PixelTile";
import type { WorkspaceHomeToolGridProps } from "@/components/app/types/workspace-home/home.types";
import type { WorkspaceToolId } from "@/components/app/types/workspaceNavigation.types";
import { Button } from "@/components/ui/button";

const toolDescriptions: Record<WorkspaceToolId, string> = {
  "merge-requests": "Review workspace merge requests",
  issues: "Browse workspace issues",
  documents: "Notes, specs & project files",
  library: "Images and files agents made",
  tasks: "Plan what comes next",
  terminals: "Your command line",
  worktrees: "Isolated branches of work",
  browser: "Preview your project",
  workflows: "Repeatable runs"
};

/**
 * Tools as pixel tiles: the ones pinned to the sidebar rail are lit. Hovering or focusing a tile names it in
 * the caption, which also pins or unpins it, so the home doubles as a way to shape the rail.
 */
export function WorkspaceHomeToolGrid({ tools, pins, onOpenTool, onTogglePin }: WorkspaceHomeToolGridProps) {
  const [previewId, setPreviewId] = useState<WorkspaceToolId | null>(null);
  const preview = tools.find((tool) => tool.id === previewId) ?? null;
  const pinned = !!preview && pins.includes(preview.id);
  return <div className="pixel-dots rounded-xl border bg-muted/20 p-3">
    <div className="mb-3 flex min-h-9 items-center gap-2">
      <div key={preview?.id ?? "none"} className="pixel-text-in min-w-0 flex-1" aria-live="polite">
        <p className="truncate text-sm font-medium">{preview?.label ?? "Project tools"}</p>
        <p className="truncate text-[11px] text-muted-foreground">{preview
          ? `${toolDescriptions[preview.id]}${pinned ? " · in your sidebar" : ""}`
          : `${pins.length} lit ${pins.length === 1 ? "tool is" : "tools are"} pinned to your sidebar`}</p>
      </div>
      {preview && onTogglePin && <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground"
        aria-label={`${pinned ? "Unpin" : "Pin"} ${preview.label} ${pinned ? "from" : "to"} the sidebar`} tooltip={pinned ? "Unpin from sidebar" : "Pin to sidebar"}
        onClick={() => onTogglePin(preview.id)}>
        {pinned ? <PinOff className="size-3.5" aria-hidden="true" /> : <Pin className="size-3.5" aria-hidden="true" />}
      </Button>}
    </div>
    <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-9 lg:grid-cols-5">
      {tools.map(({ id, label, icon }, index) => <PixelTile key={id} icon={icon} active={pins.includes(id)} aria-label={`Open ${label}`}
        aria-description={`${toolDescriptions[id]}${pins.includes(id) ? ". Pinned to the sidebar" : ""}`}
        className="pixel-pop-in bg-popover/80" style={{ animationDelay: `${index * 35}ms` }}
        onMouseEnter={() => setPreviewId(id)} onFocus={() => setPreviewId(id)} onClick={() => onOpenTool(id)} />)}
    </div>
  </div>;
}
