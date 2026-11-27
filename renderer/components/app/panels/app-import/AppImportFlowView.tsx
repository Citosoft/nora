import { isAppImportRowChecked } from "@/components/app/logic/app-import/appImportChecklist";
import { AppImportBotTabsView } from "@/components/app/panels/app-import/AppImportBotTabsView";
import { AppImportChecklistView } from "@/components/app/panels/app-import/AppImportChecklistView";
import { AppImportResultView } from "@/components/app/panels/app-import/AppImportResultView";
import type { AppImportBotTabId, AppImportFlowViewProps } from "@/components/app/types/appImport.types";
import { Button } from "@/components/ui/button";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";

/** The single import flow, shared by Settings and onboarding; the caller owns the controller. */
export function AppImportFlowView({ flow }: AppImportFlowViewProps) {
  const { phase } = flow;
  // Kept here, above the loading state, so reloading doesn't send the user back to the first tab.
  const [activeBotTab, setActiveBotTab] = useState<AppImportBotTabId | null>(null);
  if (phase.kind === "idle" || phase.kind === "loading") {
    return <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" aria-hidden />{flow.scope === "bots" ? "Looking for bots in Orca and OpenBot…" : "Looking in Claude, Codex, T3 Code and Orca…"}</p>;
  }
  if (phase.kind === "failed") {
    return <div className="space-y-3"><p role="alert" className="text-sm text-destructive">{phase.message}</p><Button type="button" variant="outline" size="sm" onClick={flow.reload}>Try again</Button></div>;
  }
  if (phase.kind === "done") {
    return <div className="space-y-3"><AppImportResultView results={phase.results} unavailable={phase.unavailable} /><Button type="button" variant="outline" size="sm" onClick={flow.reload}>Back to the checklist</Button></div>;
  }
  const { checklist } = phase;
  const progress = phase.kind === "applying" ? phase.progress : null;
  const tickedRows = checklist.groups.reduce((sum, group) => sum + group.rows.filter((row) => isAppImportRowChecked(row, flow.selected)).length, 0);
  return (
    <div className="space-y-3">
      {flow.scope === "bots"
        ? <AppImportBotTabsView tabs={flow.botTabs} activeTab={activeBotTab} onActiveTabChange={setActiveBotTab} selected={flow.selected} disabled={flow.applying} botExport={flow.botExport} onToggleRow={flow.toggleRow} onSetGroup={flow.setGroupSelected} />
        : <AppImportChecklistView checklist={checklist} selected={flow.selected} disabled={flow.applying} onToggleRow={flow.toggleRow} onSetGroup={flow.setGroupSelected} />}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={flow.apply} disabled={flow.applying || tickedRows === 0}>
          {flow.applying ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
          {flow.applying ? "Importing…" : `Import ${tickedRows} selected`}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={flow.reload} disabled={flow.applying}>Look again</Button>
        <span role="status" className="text-xs text-muted-foreground">{progress ? `${progress.label} (${Math.min(progress.completed + 1, progress.total)} of ${progress.total})` : ""}</span>
      </div>
    </div>
  );
}
