import { useSettingsRuntime } from "@/components/app/hooks/useSettingsRuntime";
import { SettingRow, SettingsSectionHeader, ToggleButton } from "@/components/app/panels/settings/settingsUi";
import { IdeBadge } from "@/components/app/shared/IdeBadge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Select } from "@/components/ui/select";
import { APP_SHORT_NAME } from "@shared/appMeta";
import type { AppSettings } from "@shared/appTypes";
import { ChevronDown, Code2, SlidersHorizontal } from "lucide-react";
import { useMemo } from "react";

export function GeneralSettingsSection() {
  const {
    missingOptionalStartupDependencyCount,
    openStartupDependenciesDialog,
    installedIdes,
    defaultIdeId,
    updateDefaultIde,
    appSettings,
    updateWorkspaceStateStorageMode,
    updateDefaultAgentLaunchTarget,
    updateAgentCompletionNotifications
  } = useSettingsRuntime();
  const selectedDefaultIdeId = useMemo(
    () => (defaultIdeId && installedIdes.some((ide) => ide.id === defaultIdeId) ? defaultIdeId : ""),
    [defaultIdeId, installedIdes]
  );
  const selectedDefaultIde = useMemo(
    () => installedIdes.find((ide) => ide.id === selectedDefaultIdeId) ?? null,
    [installedIdes, selectedDefaultIdeId]
  );

  return (
    <div className="max-w-4xl">
      <SettingsSectionHeader
        title="General"
        description="Core workspace preferences and defaults."
        icon={SlidersHorizontal}
      />
      {missingOptionalStartupDependencyCount > 0 ? (
        <SettingRow
          title="Optional Startup Dependencies"
          description={`${missingOptionalStartupDependencyCount} optional startup ${missingOptionalStartupDependencyCount === 1 ? "dependency is" : "dependencies are"} missing. Open the dependency checklist to review install guidance.`}
          control={
            <Button variant="outline" size="sm" onClick={openStartupDependenciesDialog}>
              Review dependencies
            </Button>
          }
        />
      ) : null}
      <SettingRow
        title="Default IDE"
        description={`Choose which installed IDE ${APP_SHORT_NAME} should preselect from the title bar. If that IDE is unavailable, ${APP_SHORT_NAME} falls back to the first detected IDE.`}
        control={
          <div className="space-y-3">
            {installedIdes.length ? (
              <DropdownMenu
                align="end"
                widthClassName="w-[280px]"
                trigger={(
                  <button
                    type="button"
                    className="flex h-10 w-full items-center justify-between rounded-[5px] border border-input bg-background px-3 py-2 text-sm ring-offset-background transition hover:bg-accent/40"
                    aria-label="Choose default IDE"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {selectedDefaultIde ? (
                        <IdeBadge ide={selectedDefaultIde} className="size-4" iconClassName="size-2.5" />
                      ) : (
                        <Code2 className="size-4 text-primary" />
                      )}
                      <span className="truncate">
                        {selectedDefaultIde ? selectedDefaultIde.name : "Use automatic selection"}
                      </span>
                    </span>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                )}
              >
                <DropdownMenuItem onSelect={() => updateDefaultIde(null)}>
                  <Code2 className="size-4 text-primary" />
                  <span className="truncate">Use automatic selection</span>
                  {!selectedDefaultIde ? (
                    <span className="ml-auto rounded-[4px] bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
                      Current
                    </span>
                  ) : null}
                </DropdownMenuItem>
                {installedIdes.map((ide) => (
                  <DropdownMenuItem key={ide.id} onSelect={() => updateDefaultIde(ide.id)}>
                    <IdeBadge ide={ide} className="size-4" iconClassName="size-2.5" />
                    <span className="truncate">{ide.name}</span>
                    {selectedDefaultIde?.id === ide.id ? (
                      <span className="ml-auto rounded-[4px] bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
                        Current
                      </span>
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenu>
            ) : (
              <button
                type="button"
                disabled
                className="flex h-10 w-full items-center justify-between rounded-[5px] border border-input bg-background px-3 py-2 text-sm opacity-60"
                aria-label="No IDEs detected"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Code2 className="size-4 text-primary" />
                  <span className="truncate">No IDEs detected</span>
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
              </button>
            )}
            <Button variant="outline" size="sm" onClick={() => updateDefaultIde(null)} disabled={!defaultIdeId}>
              Clear default IDE
            </Button>
          </div>
        }
      />
      <SettingRow
        title="Workspace State Location"
        description="Choose whether Nora stores workspace state such as tasks, specs, notes, task boards, and split views in your home `.nora` folder or in each repository's `.nora` folder."
        control={(
          <Select
            value={appSettings.workspaceStateStorageMode}
            onChange={(event) => updateWorkspaceStateStorageMode(event.target.value as AppSettings["workspaceStateStorageMode"])}
          >
            <option value="repo">Inside each repo (.nora)</option>
            <option value="home">In home directory (~/.nora)</option>
          </Select>
        )}
      />
      <SettingRow
        title="Default Agent Launch Target"
        description="Choose which launch target Nora preselects in the New agent dialog when no explicit target is provided."
        control={(
          <Select
            value={appSettings.defaultAgentLaunchTarget}
            onChange={(event) => updateDefaultAgentLaunchTarget(event.target.value as AppSettings["defaultAgentLaunchTarget"])}
          >
            <option value="current-branch">Current branch</option>
            <option value="new">New worktree</option>
            <option value="existing">Existing worktree</option>
            <option value="branch-existing">Checkout existing branch</option>
            <option value="branch-new">Create and checkout new branch</option>
          </Select>
        )}
      />
      <SettingRow
        title="Agent Completion Notifications"
        description={`Show an OS notification when an agent finishes a burst of work while ${APP_SHORT_NAME} is not focused.`}
        control={
          <ToggleButton
            checked={appSettings.agentCompletionNotificationsEnabled}
            onChange={updateAgentCompletionNotifications}
            label={appSettings.agentCompletionNotificationsEnabled ? "Enabled" : "Disabled"}
          />
        }
      />
    </div>
  );
}
