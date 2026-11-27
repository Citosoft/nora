import { AppImportRowGroupView } from "@/components/app/panels/app-import/AppImportRowGroupView";
import { AppImportSourceSummaryView } from "@/components/app/panels/app-import/AppImportSourceSummaryView";
import { AppImportLeftBehindView } from "@/components/app/panels/app-import/AppImportLeftBehindView";
import type { AppImportChecklistViewProps } from "@/components/app/types/appImport.types";
import { TriangleAlert } from "lucide-react";

export function AppImportChecklistView({ checklist, selected, disabled, onToggleRow, onSetGroup }: AppImportChecklistViewProps) {
  return (
    <div className="space-y-3">
      <AppImportSourceSummaryView sources={checklist.sources} />
      {checklist.hasSensitive ? (
        <p className="flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-400/40 dark:bg-amber-950 dark:text-amber-100">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Environment variables can contain API keys, so they start unticked. Ticked ones are saved to Nora's secrets, never to plain settings.
        </p>
      ) : null}
      {checklist.warnings.map((warning) => <p key={warning} role="alert" className="text-xs text-destructive">{warning}</p>)}
      {checklist.groups.length ? checklist.groups.map((group) => (
        <AppImportRowGroupView key={group.kind} group={group} selected={selected} disabled={disabled} onToggleRow={onToggleRow} onSetGroup={onSetGroup} />
      )) : <p className="text-sm text-muted-foreground">Nothing to import here yet.</p>}
      <AppImportLeftBehindView items={checklist.leftBehind} />
    </div>
  );
}
