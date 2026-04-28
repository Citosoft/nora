import type { WorkspaceFileIconKind } from "@/lib/types/workspaceFileIcon.types";
import { cn } from "@/lib/utils";
import { getWorkspaceCodeSimpleIcon } from "@/lib/workspaceCodeSimpleIcon";
import { getWorkspaceFileIconKind } from "@/lib/workspaceFileIconKind";
import {
  Binary,
  BookMarked,
  Database,
  File,
  FileArchive,
  FileCode2,
  FileCog,
  FileDiff,
  FileImage,
  FileJson,
  FileKey,
  FileMusic,
  FileSpreadsheet,
  FileTerminal,
  FileText,
  FileType,
  FileVideo,
  type LucideIcon
} from "lucide-react";

const KIND_ICONS: Record<WorkspaceFileIconKind, LucideIcon> = {
  archive: FileArchive,
  audio: FileMusic,
  binary: Binary,
  code: FileCode2,
  config: FileCog,
  database: Database,
  diff: FileDiff,
  font: FileType,
  generic: File,
  image: FileImage,
  json: FileJson,
  keys: FileKey,
  markdown: BookMarked,
  sheet: FileSpreadsheet,
  terminal: FileTerminal,
  text: FileText,
  video: FileVideo
};

export function WorkspaceFileIcon({
  path,
  className,
  isActive = false
}: {
  path: string;
  className?: string;
  isActive?: boolean;
}) {
  const kind = getWorkspaceFileIconKind(path);
  if (kind === "code") {
    const BrandIcon = getWorkspaceCodeSimpleIcon(path);
    if (BrandIcon) {
      return (
        <BrandIcon
          aria-hidden
          color="default"
          size={16}
          className={cn(
            className,
            isActive ? "drop-shadow-[0_0_0.5px_hsl(var(--primary))]" : "opacity-90"
          )}
        />
      );
    }
  }
  const Icon = KIND_ICONS[kind];
  return (
    <Icon
      aria-hidden
      className={cn(className, isActive ? "text-primary" : "text-muted-foreground")}
    />
  );
}
