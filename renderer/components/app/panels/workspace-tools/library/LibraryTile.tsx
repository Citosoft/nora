import { WorkspaceFileIcon } from "@/lib/WorkspaceFileIcon";
import { outputKindLabel } from "@/components/app/constants/outputKinds";
import { useLibraryThumbnail } from "@/components/app/hooks/useLibraryThumbnail";
import { libraryEntryKey } from "@/components/app/logic/library/libraryEntries";
import type { LibraryEntry, LibraryGrouping, LibraryTileProps } from "@/components/app/types/library.types";
import type { ThreadOutputKind } from "@/components/app/types/threadOutputs.types";
import { cn } from "@/lib/utils";

/** Soft per-kind tints so non-image tiles read at a glance without competing with real thumbnails. */
const KIND_TINTS: Record<ThreadOutputKind, string> = {
  image: "from-sky-500/15 to-sky-500/5", document: "from-rose-500/15 to-rose-500/5", sheet: "from-emerald-500/15 to-emerald-500/5",
  video: "from-violet-500/15 to-violet-500/5", audio: "from-amber-500/15 to-amber-500/5", archive: "from-slate-500/20 to-slate-500/5"
};

function extension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toUpperCase().slice(0, 5) : outputKindLabel("document").toUpperCase();
}

/** The caption names what the section heading doesn't already say. */
function caption(entry: LibraryEntry, grouping: LibraryGrouping): string {
  if (grouping === "thread") return new Date(entry.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${entry.threadTitle}${entry.archived ? " (settled)" : ""}`;
}

/** One output as a thumbnail card: the image itself, or a tinted tile with its file type. */
export function LibraryTile({ entry, grouping, selected, thumbnails, onOpen }: LibraryTileProps) {
  const { ref, preview } = useLibraryThumbnail<HTMLButtonElement>(thumbnails, entry.kind === "image" ? libraryEntryKey(entry) : null);
  const detail = entry.source === "tool" && entry.description ? entry.description : entry.path;
  return <li className="min-w-0">
    <button ref={ref} type="button" onClick={() => onOpen(entry)} title={`${entry.name}\n${detail}`} aria-label={`Open ${entry.name}`}
      className={cn("group flex w-full min-w-0 flex-col gap-2 rounded-xl p-1.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "bg-secondary" : "hover:bg-muted/70")}>
      <span className={cn("relative block aspect-[4/3] w-full overflow-hidden rounded-lg border border-border/60 bg-gradient-to-br shadow-sm transition group-hover:shadow-md",
        KIND_TINTS[entry.kind])}>
        {preview
          ? <img src={preview.dataUrl} alt="" className="size-full object-cover transition duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
          : <span className="flex size-full flex-col items-center justify-center gap-2">
            <WorkspaceFileIcon path={entry.name} className="size-9" />
            <span className="rounded-md bg-background/70 px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide text-muted-foreground">{extension(entry.name)}</span>
          </span>}
      </span>
      <span className="min-w-0 px-0.5">
        <span className="block truncate text-[13px] font-medium">{entry.name}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{caption(entry, grouping)}</span>
      </span>
    </button>
  </li>;
}
