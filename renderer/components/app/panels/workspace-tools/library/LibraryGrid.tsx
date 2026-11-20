import type { LibraryGridProps } from "@/components/app/types/library.types";
import { libraryEntryKey } from "@/components/app/logic/library/libraryEntries";
import { LibraryTile } from "./LibraryTile";

/** Sections of thumbnail tiles, each under a sticky heading. */
export function LibraryGrid({ sections, grouping, selectedKey, thumbnails, onOpen }: LibraryGridProps) {
  return <div className="space-y-7">{sections.map((section) => <section key={section.key} aria-labelledby={`library-${section.key}`}>
    <h3 id={`library-${section.key}`} className="sticky top-0 z-10 -mx-1 mb-2 flex items-baseline gap-2 bg-background/90 px-1 py-2 backdrop-blur">
      <span className="min-w-0 truncate text-sm font-semibold">{section.label}</span>
      <span className="text-xs tabular-nums text-muted-foreground">{section.entries.length}</span>
    </h3>
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-x-3 gap-y-4">
      {section.entries.map((entry) => <LibraryTile key={libraryEntryKey(entry)} entry={entry} grouping={grouping}
        selected={selectedKey === libraryEntryKey(entry)} thumbnails={thumbnails} onOpen={onOpen} />)}
    </ul>
  </section>)}</div>;
}
