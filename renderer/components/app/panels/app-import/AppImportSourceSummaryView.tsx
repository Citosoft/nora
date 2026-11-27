import { AppImportSourceIcon } from "@/components/app/shared/AppImportSourceIcon";
import type { AppImportSourceSummaryViewProps } from "@/components/app/types/appImport.types";
import { cn } from "@/lib/utils";

export function AppImportSourceSummaryView({ sources }: AppImportSourceSummaryViewProps) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2" aria-label="Apps Nora looked in">
      {sources.map((source) => (
        <li key={source.id} className="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-2.5">
          <AppImportSourceIcon source={source.source} className={cn("size-8", !source.found && "opacity-40 grayscale")} />
          <span className="min-w-0">
            <span className="block text-sm font-medium">{source.name}</span>
            <span className="block break-words text-xs text-muted-foreground">{source.description}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
