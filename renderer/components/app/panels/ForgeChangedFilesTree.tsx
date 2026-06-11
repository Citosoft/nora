import { buildFileTree, ensureAncestorDirectories } from "@/components/app/logic/fileTreePanelUtils";
import type { ForgeChangedFilesTreeProps } from "@/components/app/types/forgeChangedFile.types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WorkspaceFileIcon } from "@/lib/WorkspaceFileIcon";
import type { FileTreeNode } from "@/components/app/types/component.types";
import { ChevronDown, ChevronRight, Folder, FolderOpen, ListTree, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function ForgeChangedFilesTreeNode({
  node,
  depth,
  expandedDirectories,
  selectedChangePath,
  onToggleDirectory,
  onSelectChange
}: {
  node: FileTreeNode;
  depth: number;
  expandedDirectories: Record<string, boolean>;
  selectedChangePath: string | null;
  onToggleDirectory: (path: string) => void;
  onSelectChange: (changePath: string) => void;
}) {
  const isExpanded = node.kind === "directory" ? expandedDirectories[node.path] === true : false;
  const isSelected = node.kind === "file" && selectedChangePath === node.path;

  if (node.kind === "directory") {
    return (
      <div>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-left text-sm transition hover:bg-accent/30",
            "text-muted-foreground hover:text-foreground"
          )}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
          onClick={() => onToggleDirectory(node.path)}
          title={node.path || "root"}
        >
          {isExpanded ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
          {isExpanded ? <FolderOpen className="size-4 shrink-0 text-primary" /> : <Folder className="size-4 shrink-0 text-primary" />}
          <span className="min-w-0 truncate">{node.name || "Files"}</span>
        </button>
        {isExpanded ? (
          <div className="space-y-0.5">
            {node.children.map((child) => (
              <ForgeChangedFilesTreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                expandedDirectories={expandedDirectories}
                selectedChangePath={selectedChangePath}
                onToggleDirectory={onToggleDirectory}
                onSelectChange={onSelectChange}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-left text-sm transition hover:bg-accent/30",
        isSelected ? "bg-primary/10 text-foreground" : "text-foreground/90"
      )}
      style={{ paddingLeft: `${8 + depth * 14}px` }}
      onClick={() => onSelectChange(node.path)}
      title={node.path}
    >
      <span className="size-4 shrink-0" />
      <WorkspaceFileIcon path={node.path} className="size-4 shrink-0" isActive={isSelected} />
      <span className="min-w-0 truncate">{node.name}</span>
    </button>
  );
}

export function ForgeChangedFilesTree({
  changes,
  selectedChangePath,
  onSelectChange,
  onClose
}: ForgeChangedFilesTreeProps) {
  const [expandedDirectories, setExpandedDirectories] = useState<Record<string, boolean>>({});

  const tree = useMemo(() => {
    const filePaths = changes.map((change) => change.path);
    const directoryPaths = Array.from(
      new Set(changes.flatMap((change) => ensureAncestorDirectories(change.path)))
    );
    return buildFileTree(filePaths, directoryPaths);
  }, [changes]);

  useEffect(() => {
    if (!selectedChangePath) {
      return;
    }

    const ancestorPaths = ensureAncestorDirectories(selectedChangePath);
    if (!ancestorPaths.length) {
      return;
    }

    setExpandedDirectories((current) => {
      const next = { ...current };
      for (const path of ancestorPaths) {
        next[path] = true;
      }
      return next;
    });
  }, [selectedChangePath]);

  if (!tree.length) {
    return null;
  }

  const toggleDirectory = (path: string): void => {
    setExpandedDirectories((current) => ({
      ...current,
      [path]: current[path] !== true
    }));
  };

  return (
    <aside className="flex max-h-[min(32rem,calc(100vh-8rem))] h-full w-full flex-col overflow-hidden rounded-[10px] border border-border/60 bg-card/80 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border/50 px-3 py-2">
        <div className="flex items-center gap-2">
          <ListTree className="size-4 text-primary" />
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Files</div>
            <div className="text-[11px] text-muted-foreground">{changes.length} changed file{changes.length === 1 ? "" : "s"}</div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="size-7 rounded-[4px]" onClick={onClose} aria-label="Close file tree">
          <X className="size-3.5" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        <div className="space-y-0.5">
          {tree.map((node) => (
            <ForgeChangedFilesTreeNode
              key={node.path}
              node={node}
              depth={0}
              expandedDirectories={expandedDirectories}
              selectedChangePath={selectedChangePath}
              onToggleDirectory={toggleDirectory}
              onSelectChange={(changePath) => onSelectChange(changePath)}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
