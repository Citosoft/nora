import { isAppImportRowChecked } from "@/components/app/logic/app-import/appImportChecklist";
import { AppImportBotExportPanel } from "@/components/app/panels/app-import/AppImportBotExportPanel";
import { AppImportBotTabIcon } from "@/components/app/panels/app-import/AppImportBotTabIcon";
import { AppImportLeftBehindView } from "@/components/app/panels/app-import/AppImportLeftBehindView";
import { AppImportRowGroupView } from "@/components/app/panels/app-import/AppImportRowGroupView";
import type { AppImportBotTab, AppImportBotTabsViewProps } from "@/components/app/types/appImport.types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function tickedCount(tab: AppImportBotTab, selected: ReadonlySet<string>): number {
  return tab.checklist.groups.reduce((sum, group) => sum + group.rows.filter((row) => isAppImportRowChecked(row, selected)).length, 0);
}

function emptyMessage(tab: AppImportBotTab): string {
  if (tab.id === "grok-bot") return "Paste an export below to see Grok Bot's bots here.";
  const summary = tab.checklist.sources[0];
  if (summary && !summary.found) return `${tab.label}: ${summary.description}.`;
  return tab.exportGuide ? `${tab.label} has no bots on this computer.` : `${tab.label} has no bots to import.`;
}

/** Opens the first tab with bots, else one with something to tell the user, else Grok Bot. */
function defaultTab(tabs: readonly AppImportBotTab[]): AppImportBotTab["id"] {
  return (tabs.find((tab) => tab.checklist.groups.length > 0) ?? tabs.find((tab) => tab.notice))?.id ?? "grok-bot";
}

/** One tab per app with bots; ticks in every tab go into the same import. */
export function AppImportBotTabsView({ tabs, activeTab, onActiveTabChange, selected, disabled, botExport, onToggleRow, onSetGroup }: AppImportBotTabsViewProps) {
  const value = activeTab ?? defaultTab(tabs);
  return (
    <Tabs value={value} onValueChange={(next) => { const tab = tabs.find((entry) => entry.id === next); if (tab) onActiveTabChange(tab.id); }} className="space-y-3">
      <TabsList aria-label="Apps to import bots from">
        {tabs.map((tab) => {
          const ticked = tickedCount(tab, selected);
          return (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
              <AppImportBotTabIcon tab={tab.id} className="size-4" />
              {tab.label}
              {ticked ? <span className="rounded-full bg-primary/15 px-1.5 text-[11px] text-primary">{ticked}</span> : null}
            </TabsTrigger>
          );
        })}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="mt-0 space-y-3">
          {tab.notice ? <p className="text-sm text-muted-foreground">{tab.notice}</p> : null}
          {tab.checklist.warnings.map((warning) => <p key={warning} role="alert" className="text-xs text-destructive">{warning}</p>)}
          {tab.checklist.groups.length ? tab.checklist.groups.map((group) => (
            <AppImportRowGroupView key={group.kind} group={group} selected={selected} disabled={disabled} onToggleRow={onToggleRow} onSetGroup={onSetGroup} />
          )) : <p className="text-sm text-muted-foreground">{emptyMessage(tab)}</p>}
          <AppImportLeftBehindView items={tab.checklist.leftBehind} />
          {tab.exportGuide ? <AppImportBotExportPanel guide={tab.exportGuide} botExport={botExport} disabled={disabled} /> : null}
        </TabsContent>
      ))}
    </Tabs>
  );
}
