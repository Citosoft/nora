import {
  buildChildPath,
  buildFileTree,
  buildSiblingPath,
  ensureAncestorDirectories,
  getDefaultNewFileName,
  getDefaultNewFolderName,
  getFileName,
  listSiblingNames
} from "@/components/app/logic/fileTreePanelUtils";
import { setWorkspaceRelativePathDragData } from "@/components/app/logic/workspacePathDrag";
import type { FileTreeNode, FileTreePanelProps } from "@/components/app/types/component.types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { WorkspaceFileIcon } from "@/lib/WorkspaceFileIcon";
import type { ChangeEntry } from "@shared/appTypes";
import { ChevronDown, ChevronRight, FilePenLine, FilePlus, Folder, FolderOpen, FolderPlus, LoaderCircle, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from "react";

type FileTreeContextMenuState = {
  path: string;
  name: string;
  kind: "file" | "directory";
  top: number;
  left: number;
};

type InlineRenameState =
  | {
      mode: "rename-file";
      path: string;
      draft: string;
      errorMessage: string | null;
    }
  | {
      mode: "create-directory";
      path: string;
      parentPath: string;
      initialName: string;
      draft: string;
      hasEdited: boolean;
      errorMessage: string | null;
    }
  | {
      mode: "create-file";
      path: string;
      parentPath: string;
      initialName: string;
      draft: string;
      hasEdited: boolean;
      errorMessage: string | null;
    };

type DroppedBrowserImage = {
  sourceUrl?: string;
  data?: Uint8Array;
  mimeType?: string;
  suggestedFileName?: string;
};

const DROPPED_BROWSER_IMAGE_TYPES = ["DownloadURL", "text/uri-list", "text/plain", "Files"] as const;

function isLikelyImageUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return /\.(png|jpe?g|gif|webp|bmp|svg|avif)(?:$|\?)/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function parseDroppedBrowserImage(event: DragEvent<HTMLElement>): DroppedBrowserImage | null {
  const downloadUrl = event.dataTransfer.getData("DownloadURL").trim();
  if (downloadUrl) {
    const firstSeparator = downloadUrl.indexOf(":");
    const secondSeparator = firstSeparator >= 0 ? downloadUrl.indexOf(":", firstSeparator + 1) : -1;
    if (firstSeparator > 0 && secondSeparator > firstSeparator) {
      const mimeType = downloadUrl.slice(0, firstSeparator).trim().toLowerCase();
      const suggestedFileName = downloadUrl.slice(firstSeparator + 1, secondSeparator).trim();
      const sourceUrl = downloadUrl.slice(secondSeparator + 1).trim();
      if (mimeType.startsWith("image/") && sourceUrl) {
        return {
          sourceUrl,
          suggestedFileName: suggestedFileName || undefined
        };
      }
    }
  }

  const uriList = event.dataTransfer.getData("text/uri-list").trim();
  if (uriList && isLikelyImageUrl(uriList)) {
    return { sourceUrl: uriList };
  }

  const plainText = event.dataTransfer.getData("text/plain").trim();
  if (plainText && isLikelyImageUrl(plainText)) {
    return { sourceUrl: plainText };
  }

  return null;
}

async function extractDroppedBrowserImage(event: DragEvent<HTMLElement>): Promise<DroppedBrowserImage | null> {
  const imageFile = Array.from(event.dataTransfer.files).find((file) => file.type.startsWith("image/"));
  if (imageFile) {
    return {
      data: new Uint8Array(await imageFile.arrayBuffer()),
      mimeType: imageFile.type || "image/png",
      suggestedFileName: imageFile.name || undefined
    };
  }

  return parseDroppedBrowserImage(event);
}

function hasDroppedBrowserImageCandidate(event: DragEvent<HTMLElement>): boolean {
  const availableTypes = new Set(event.dataTransfer.types);
  return DROPPED_BROWSER_IMAGE_TYPES.some((type) => availableTypes.has(type));
}

function getDropDebugData(event: DragEvent<HTMLElement>): Record<string, string[]> {
  return {
    types: [...event.dataTransfer.types],
    files: Array.from(event.dataTransfer.files).map((file) => `${file.name} (${file.type || "unknown"})`),
    items: Array.from(event.dataTransfer.items).map((item) => `${item.kind}:${item.type || "unknown"}`)
  };
}

function FileTreeNodeRow({
  node,
  depth,
  expandedDirectories,
  dropTargetDirectoryPath,
  changesByPath,
  activePath,
  onImportImageToDirectory,
  inlineRename,
  isRenamingInlinePath,
  onInlineRenameChange,
  onInlineRenameSubmit,
  onInlineRenameCancel,
  onOpenContextMenu,
  onDropTargetChange,
  onToggleDirectory,
  onOpenFile
}: {
  node: FileTreeNode;
  depth: number;
  expandedDirectories: Record<string, boolean>;
  dropTargetDirectoryPath: string | null;
  changesByPath: Record<string, Pick<ChangeEntry, "additions" | "deletions">>;
  activePath: string | null;
  onImportImageToDirectory: (directoryPath: string, payload: DroppedBrowserImage) => Promise<void>;
  inlineRename: InlineRenameState | null;
  isRenamingInlinePath: boolean;
  onInlineRenameChange: (value: string) => void;
  onInlineRenameSubmit: () => Promise<void>;
  onInlineRenameCancel: () => void;
  onOpenContextMenu: (node: Pick<FileTreeNode, "path" | "name" | "kind">, event: ReactMouseEvent<HTMLButtonElement>) => void;
  onDropTargetChange: (directoryPath: string | null) => void;
  onToggleDirectory: (pathName: string) => void;
  onOpenFile: (pathName: string) => void;
}) {
  const isExpanded = node.kind === "directory" ? expandedDirectories[node.path] === true : false;
  const isDropTarget = node.kind === "directory" && dropTargetDirectoryPath === node.path;
  const changeSummary = node.kind === "file" ? changesByPath[node.path] ?? null : null;
  const isInlineRenaming = inlineRename?.path === node.path;
  const handleInlineRenameKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void onInlineRenameSubmit();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onInlineRenameCancel();
    }
  };

  return (
    <>
      <button
        type="button"
        draggable={!isInlineRenaming}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition hover:bg-accent/30",
          activePath === node.path ? "bg-primary/10 text-foreground" : "text-foreground hover:text-foreground",
          isDropTarget ? "bg-primary/15 text-foreground ring-1 ring-primary/40" : null
        )}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onDragStart={(event) => {
          if (isInlineRenaming) {
            return;
          }
          setWorkspaceRelativePathDragData(event.dataTransfer, node.path, node.kind);
        }}
        onClick={() => {
          if (isInlineRenaming) {
            return;
          }
          if (node.kind === "directory") {
            onToggleDirectory(node.path);
            return;
          }
          onOpenFile(node.path);
        }}
        onContextMenu={(event) => {
          onOpenContextMenu(node, event);
        }}
        onDragOver={(event) => {
          if (node.kind !== "directory" || !hasDroppedBrowserImageCandidate(event)) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = "copy";
          onDropTargetChange(node.path);
        }}
        onDragLeave={() => {
          if (node.kind === "directory" && dropTargetDirectoryPath === node.path) {
            onDropTargetChange(null);
          }
        }}
        onDrop={(event) => {
          if (node.kind !== "directory" || !hasDroppedBrowserImageCandidate(event)) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          console.log("[nora renderer] file tree image drop received", {
            directoryPath: node.path,
            debug: getDropDebugData(event)
          });
          onDropTargetChange(null);
          void extractDroppedBrowserImage(event)
            .then((droppedImage) => {
              if (!droppedImage) {
                console.warn("[nora renderer] file tree image drop could not be parsed", {
                  directoryPath: node.path,
                  debug: getDropDebugData(event)
                });
                return;
              }
              console.log("[nora renderer] file tree image drop parsed", {
                directoryPath: node.path,
                payload: droppedImage
              });
              return onImportImageToDirectory(node.path, droppedImage);
            })
            .catch((error: unknown) => {
              console.error("[nora renderer] file tree image drop import failed", {
                directoryPath: node.path,
                error
              });
            });
        }}
        title={node.path}
      >
        {node.kind === "directory"
          ? (
            <>
              {isExpanded ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
              {isExpanded ? <FolderOpen className="size-4 shrink-0 text-primary" /> : <Folder className="size-4 shrink-0 text-primary" />}
            </>
          )
          : (
            <>
              <span className="size-4 shrink-0" />
              <WorkspaceFileIcon path={node.path} className="size-4 shrink-0" isActive={activePath === node.path} />
            </>
          )}
        {isInlineRenaming && inlineRename ? (
          <div className="min-w-0 flex-1" onClick={(event) => event.stopPropagation()}>
            <Input
              value={inlineRename.draft}
              onChange={(event) => onInlineRenameChange(event.target.value)}
              onFocus={(event) => {
                if (inlineRename.mode === "create-directory" || inlineRename.mode === "create-file") {
                  event.currentTarget.select();
                }
              }}
              onKeyDown={handleInlineRenameKeyDown}
              onBlur={() => {
                void onInlineRenameSubmit();
              }}
              autoFocus
              className={cn(
                "h-8",
                inlineRename.errorMessage ? "border-destructive focus-visible:ring-destructive" : null
              )}
              aria-label={
                inlineRename.mode === "create-directory"
                  ? "New folder name"
                  : inlineRename.mode === "create-file"
                    ? "New file name"
                    : `Rename ${node.name}`
              }
            />
            {inlineRename.errorMessage ? (
              <div className="pt-1 text-xs text-destructive">{inlineRename.errorMessage}</div>
            ) : null}
          </div>
        ) : (
          <span className="truncate">{node.name}</span>
        )}
        {changeSummary ? (
          <span className="ml-auto flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
            <span className="text-emerald-500">+{changeSummary.additions}</span>
            <span className="text-destructive">-{changeSummary.deletions}</span>
          </span>
        ) : null}
      </button>
      {node.kind === "directory" && isExpanded
        ? node.children.map((child) => (
            <FileTreeNodeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              expandedDirectories={expandedDirectories}
              dropTargetDirectoryPath={dropTargetDirectoryPath}
              changesByPath={changesByPath}
              activePath={activePath}
              onImportImageToDirectory={onImportImageToDirectory}
              inlineRename={inlineRename}
              isRenamingInlinePath={isRenamingInlinePath}
              onInlineRenameChange={onInlineRenameChange}
              onInlineRenameSubmit={onInlineRenameSubmit}
              onInlineRenameCancel={onInlineRenameCancel}
              onOpenContextMenu={onOpenContextMenu}
              onDropTargetChange={onDropTargetChange}
              onToggleDirectory={onToggleDirectory}
              onOpenFile={onOpenFile}
            />
          ))
        : null}
    </>
  );
}

export function FileTreePanel({
  files,
  directoryPaths,
  changesByPath,
  activePath,
  isLoading,
  errorMessage,
  searchQuery,
  searchResults,
  isSearching,
  isCaseSensitiveSearch,
  onSearchQueryChange,
  onCaseSensitiveSearchChange,
  onOpenFile,
  onImportImageToDirectory,
  onCreateFile,
  onCreateDirectory,
  onRenameFile,
  onDeleteFile
}: FileTreePanelProps) {
  const [expandedDirectories, setExpandedDirectories] = useState<Record<string, boolean>>({});
  const [dropTargetDirectoryPath, setDropTargetDirectoryPath] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<FileTreeContextMenuState | null>(null);
  const [createdDirectoryPaths, setCreatedDirectoryPaths] = useState<string[]>([]);
  const [transientDirectoryPath, setTransientDirectoryPath] = useState<string | null>(null);
  const [transientFilePath, setTransientFilePath] = useState<string | null>(null);
  const [inlineRename, setInlineRename] = useState<InlineRenameState | null>(null);
  const [isRenamingFile, setIsRenamingFile] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ path: string; kind: "file" | "directory" } | null>(null);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const treeDirectoryPaths = useMemo(() => {
    const unique = new Set<string>([...directoryPaths, ...createdDirectoryPaths]);
    if (transientDirectoryPath) {
      unique.add(transientDirectoryPath);
    }
    return Array.from(unique).sort((left, right) => left.localeCompare(right));
  }, [createdDirectoryPaths, directoryPaths, transientDirectoryPath]);
  const treeFilePaths = useMemo(() => {
    if (!transientFilePath) {
      return files;
    }
    return files.includes(transientFilePath) ? files : [...files, transientFilePath];
  }, [files, transientFilePath]);
  const fileTree = useMemo(() => buildFileTree(treeFilePaths, treeDirectoryPaths), [treeFilePaths, treeDirectoryPaths]);
  const trimmedSearchQuery = searchQuery.trim();

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    const closeContextMenu = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!contextMenuRef.current?.contains(target)) {
        setContextMenu(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };

    const handleViewportChange = () => {
      setContextMenu(null);
    };

    window.addEventListener("pointerdown", closeContextMenu);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);
    return () => {
      window.removeEventListener("pointerdown", closeContextMenu);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!activePath) {
      return;
    }

    const ancestors = ensureAncestorDirectories(activePath);
    if (!ancestors.length) {
      return;
    }

    setExpandedDirectories((current) => {
      const next = { ...current };
      for (const pathName of ancestors) {
        next[pathName] = true;
      }
      return next;
    });
  }, [activePath]);

  useEffect(() => {
    if (!transientFilePath || !files.includes(transientFilePath)) {
      return;
    }
    setTransientFilePath(null);
  }, [files, transientFilePath]);

  useEffect(() => {
    setCreatedDirectoryPaths((current) => {
      const next = current.filter((pathName) => !directoryPaths.includes(pathName));
      if (next.length === current.length) {
        return current;
      }
      return next;
    });
  }, [directoryPaths]);

  const toggleDirectory = (pathName: string) => {
    setExpandedDirectories((current) => ({
      ...current,
      [pathName]: current[pathName] !== true
    }));
  };

  const openContextMenu = (node: Pick<FileTreeNode, "path" | "name" | "kind">, event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      path: node.path,
      name: node.name,
      kind: node.kind,
      top: event.clientY,
      left: event.clientX
    });
  };

  const startInlineRename = (pathName: string) => {
    setContextMenu(null);
    setInlineRename({
      mode: "rename-file",
      path: pathName,
      draft: getFileName(pathName),
      errorMessage: null
    });
  };

  const startCreateDirectory = (parentPath: string) => {
    setContextMenu(null);
    setExpandedDirectories((current) => ({ ...current, [parentPath]: true }));
    const siblingNames = listSiblingNames(files, treeDirectoryPaths, parentPath);
    const defaultDirectoryName = getDefaultNewFolderName(siblingNames);
    const placeholderPath = buildChildPath(parentPath, defaultDirectoryName);
    setTransientDirectoryPath(placeholderPath);
    setInlineRename({
      mode: "create-directory",
      path: placeholderPath,
      parentPath,
      initialName: defaultDirectoryName,
      draft: defaultDirectoryName,
      hasEdited: false,
      errorMessage: null
    });
  };
  const startCreateFile = (parentPath: string) => {
    setContextMenu(null);
    setExpandedDirectories((current) => ({ ...current, [parentPath]: true }));
    const siblingNames = listSiblingNames(files, treeDirectoryPaths, parentPath);
    const defaultFileName = getDefaultNewFileName(siblingNames);
    const placeholderPath = buildChildPath(parentPath, defaultFileName);
    setTransientFilePath(placeholderPath);
    setInlineRename({
      mode: "create-file",
      path: placeholderPath,
      parentPath,
      initialName: defaultFileName,
      draft: defaultFileName,
      hasEdited: false,
      errorMessage: null
    });
  };

  const cancelInlineRename = () => {
    if (isRenamingFile) {
      return;
    }
    if (inlineRename?.mode === "create-directory") {
      setTransientDirectoryPath(null);
    }
    if (inlineRename?.mode === "create-file") {
      setTransientFilePath(null);
    }
    setInlineRename(null);
  };

  const submitInlineRename = async () => {
    if (!inlineRename || isRenamingFile) {
      return;
    }

    const currentInlineRename = inlineRename;
    const trimmedFileName = currentInlineRename.draft.trim();
    if ((currentInlineRename.mode === "create-directory" || currentInlineRename.mode === "create-file") && !currentInlineRename.hasEdited) {
      if (currentInlineRename.mode === "create-directory") {
        setTransientDirectoryPath(null);
      } else {
        setTransientFilePath(null);
      }
      setInlineRename(null);
      return;
    }
    if (!trimmedFileName) {
      setInlineRename((current) => current ? { ...current, errorMessage: "Enter a name." } : current);
      return;
    }
    if (trimmedFileName.includes("/") || trimmedFileName.includes("\\")) {
      setInlineRename((current) => current ? { ...current, errorMessage: "Use a name, not a path." } : current);
      return;
    }

    setIsRenamingFile(true);
    try {
      if (currentInlineRename.mode === "create-directory") {
        const nextPath = buildChildPath(currentInlineRename.parentPath, trimmedFileName);
        const siblingNames = listSiblingNames(
          files,
          treeDirectoryPaths.filter((pathName) => pathName !== currentInlineRename.path),
          currentInlineRename.parentPath
        );
        if (siblingNames.has(trimmedFileName)) {
          setInlineRename((current) => current ? { ...current, errorMessage: "A file or folder with that name already exists." } : current);
          return;
        }
        setInlineRename(null);
        setTransientDirectoryPath(null);
        setCreatedDirectoryPaths((current) =>
          current.includes(nextPath) ? current : [...current, nextPath]
        );
        await onCreateDirectory(nextPath);
        return;
      }
      if (currentInlineRename.mode === "create-file") {
        const nextPath = buildChildPath(currentInlineRename.parentPath, trimmedFileName);
        const siblingNames = listSiblingNames(
          files,
          treeDirectoryPaths,
          currentInlineRename.parentPath
        );
        if (siblingNames.has(trimmedFileName)) {
          setInlineRename((current) => current ? { ...current, errorMessage: "A file or folder with that name already exists." } : current);
          return;
        }
        setInlineRename(null);
        setTransientFilePath(nextPath);
        await onCreateFile(nextPath);
        return;
      }

      const nextPath = buildSiblingPath(currentInlineRename.path, trimmedFileName);
      if (nextPath === currentInlineRename.path) {
        setInlineRename(null);
        return;
      }
      setInlineRename(null);
      await onRenameFile(currentInlineRename.path, nextPath);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unable to save.";
      if (currentInlineRename.mode === "create-directory") {
        const failedPath = buildChildPath(currentInlineRename.parentPath, trimmedFileName);
        setCreatedDirectoryPaths((current) => current.filter((pathName) => pathName !== failedPath));
        setTransientDirectoryPath(failedPath);
      }
      if (currentInlineRename.mode === "create-file") {
        setTransientFilePath(null);
      }
      if (currentInlineRename.mode === "rename-file") {
        setInlineRename({
          ...currentInlineRename,
          draft: trimmedFileName,
          errorMessage
        });
      } else {
        setInlineRename({
          ...currentInlineRename,
          draft: trimmedFileName,
          hasEdited: true,
          errorMessage
        });
      }
    } finally {
      setIsRenamingFile(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || isDeletingFile) {
      return;
    }

    setIsDeletingFile(true);
    try {
      await onDeleteFile(deleteTarget.path);
      setDeleteTarget(null);
    } catch {
      // App-level error handling already surfaces the failure.
    } finally {
      setIsDeletingFile(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" />
        <span>Loading files…</span>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="m-3 border border-dashed border-border/70 bg-background/40 p-4 text-sm text-muted-foreground">
        {errorMessage}
      </div>
    );
  }

  if (!fileTree.length) {
    return (
      <div className="m-3 border border-dashed border-border/70 bg-background/40 p-4 text-sm text-muted-foreground">
        No files available in this workspace.
      </div>
    );
  }

  return (
    <div className="min-h-0 flex flex-1 flex-col">
      <div className="border-b border-border/60 px-3 py-3">
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search file contents"
            className="h-9 pl-8 pr-20"
          />
          <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
            <Tooltip
              content={isCaseSensitiveSearch ? "Case-sensitive search enabled" : "Case-sensitive search disabled"}
              side="left"
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 min-w-0 px-1.5 text-[11px] font-medium tracking-tight",
                  isCaseSensitiveSearch ? "bg-accent text-foreground" : "text-muted-foreground"
                )}
                onClick={() => onCaseSensitiveSearchChange(!isCaseSensitiveSearch)}
                aria-pressed={isCaseSensitiveSearch}
              >
                Aa
              </Button>
            </Tooltip>
            {trimmedSearchQuery ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => onSearchQueryChange("")}
                aria-label="Clear file search"
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto py-2">
        {trimmedSearchQuery ? (
          isSearching ? (
            <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              <span>Searching files…</span>
            </div>
          ) : searchResults.length ? (
            <div className="px-2">
              {searchResults.map((result) => (
                <button
                  key={`${result.path}:${result.lineNumber ?? "path"}`}
                  type="button"
                  draggable
                  className="flex w-full flex-col items-start gap-1 rounded-[6px] px-3 py-2 text-left transition hover:bg-accent/30"
                  onDragStart={(event) => {
                    setWorkspaceRelativePathDragData(event.dataTransfer, result.path, "file");
                  }}
                  onClick={() => onOpenFile(result.path)}
                  title={result.path}
                >
                  <div className="flex w-full items-center gap-2">
                    <WorkspaceFileIcon path={result.path} className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{result.path}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {result.matchCount} match{result.matchCount === 1 ? "" : "es"}
                    </span>
                  </div>
                  {result.lineText ? (
                    <div className="line-clamp-2 pl-6 text-xs text-muted-foreground">
                      {result.lineNumber ? `Line ${result.lineNumber}: ` : ""}
                      {result.lineText}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <div className="m-3 border border-dashed border-border/70 bg-background/40 p-4 text-sm text-muted-foreground">
              No matches found for “{trimmedSearchQuery}”.
            </div>
          )
        ) : (
          fileTree.map((node) => (
            <FileTreeNodeRow
              key={node.path}
              node={node}
              depth={0}
              expandedDirectories={expandedDirectories}
              dropTargetDirectoryPath={dropTargetDirectoryPath}
              changesByPath={changesByPath}
              activePath={activePath}
              onImportImageToDirectory={onImportImageToDirectory}
              inlineRename={inlineRename}
              isRenamingInlinePath={isRenamingFile}
              onInlineRenameChange={(value) => {
                setInlineRename((current) => {
                  if (!current) {
                    return current;
                  }
                  if (current.mode === "create-directory") {
                    return {
                      ...current,
                      draft: value,
                      hasEdited: true,
                      errorMessage: null
                    };
                  }
                  if (current.mode === "create-file") {
                    return {
                      ...current,
                      draft: value,
                      hasEdited: true,
                      errorMessage: null
                    };
                  }
                  return { ...current, draft: value, errorMessage: null };
                });
              }}
              onInlineRenameSubmit={submitInlineRename}
              onInlineRenameCancel={cancelInlineRename}
              onOpenContextMenu={openContextMenu}
              onDropTargetChange={setDropTargetDirectoryPath}
              onToggleDirectory={toggleDirectory}
              onOpenFile={onOpenFile}
            />
          ))
        )}
      </div>
      {contextMenu ? (
        <div
          ref={contextMenuRef}
          className="fixed z-20 w-56 rounded-[4px] border border-border/70 bg-popover/95 p-1 shadow-2xl backdrop-blur"
          style={{ top: contextMenu.top, left: contextMenu.left }}
        >
          {contextMenu.kind === "directory" ? (
            <>
              <DropdownMenuItem onSelect={() => startCreateFile(contextMenu.path)}>
                <FilePlus className="size-4" />
                New file
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => startCreateDirectory(contextMenu.path)}>
                <FolderPlus className="size-4" />
                New folder
              </DropdownMenuItem>
              <DropdownMenuItem
                destructive
                onSelect={() => {
                  setContextMenu(null);
                  setDeleteTarget({ path: contextMenu.path, kind: "directory" });
                }}
              >
                <Trash2 className="size-4" />
                Delete folder
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onSelect={() => startInlineRename(contextMenu.path)}>
                <FilePenLine className="size-4" />
                Rename file
              </DropdownMenuItem>
              <DropdownMenuItem
                destructive
                onSelect={() => {
                  setContextMenu(null);
                  setDeleteTarget({ path: contextMenu.path, kind: "file" });
                }}
              >
                <Trash2 className="size-4" />
                Delete file
              </DropdownMenuItem>
            </>
          )}
        </div>
      ) : null}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => {
        if (!open && !isDeletingFile) {
          setDeleteTarget(null);
        }
      }}>
        <DialogContent
          onClose={() => {
            if (!isDeletingFile) {
              setDeleteTarget(null);
            }
          }}
          headerTitle={deleteTarget?.kind === "directory" ? "Delete folder" : "Delete file"}
          className="w-[min(34rem,calc(100vw-2rem))]"
        >
          <DialogBody className="space-y-4">
            <DialogDescription>
              {deleteTarget?.kind === "directory"
                ? "This removes the folder and its contents from the workspace. This action cannot be undone here."
                : "This removes the file from the workspace. This action cannot be undone here."}
            </DialogDescription>
            {deleteTarget ? (
              <div className="rounded-[4px] border border-border/70 bg-background/40 px-3 py-2 text-sm text-foreground">
                {deleteTarget.path}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={isDeletingFile}>Cancel</Button>
            <Button className="border border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => void confirmDelete()} disabled={isDeletingFile}>
              {isDeletingFile ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
