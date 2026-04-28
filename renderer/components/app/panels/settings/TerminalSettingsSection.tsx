import { useSettingsRuntime } from "@/components/app/hooks/useSettingsRuntime";
import { normalizeTerminalQuickLaunchName } from "@/components/app/logic/terminalQuickLaunch";
import { SettingRow, SettingsSectionHeader } from "@/components/app/panels/settings/settingsUi";
import { TerminalPresetsSettingsSection } from "@/components/app/panels/settings/TerminalPresetsSettingsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { APP_SHORT_NAME } from "@shared/appMeta";
import { TerminalSquare } from "lucide-react";
import { useMemo } from "react";

export function TerminalSettingsSection() {
  const {
    terminalShells,
    defaultTerminalShellId,
    updateDefaultTerminalShellId,
    appSettings,
    updateTerminalPresets,
    updateTerminalQuickLaunchDefaults
  } = useSettingsRuntime();
  const availableShells = useMemo(
    () => terminalShells.filter((shell) => shell.executable.trim().length > 0),
    [terminalShells]
  );

  return (
    <div className="max-w-4xl">
      <SettingsSectionHeader
        title="Terminal"
        description={`Set shell preferences used when ${APP_SHORT_NAME} opens new terminals.`}
        icon={TerminalSquare}
      />

      <SettingRow
        title="Default Shell"
        description={`Choose the shell ${APP_SHORT_NAME} should prefer for new terminals. If unset, ${APP_SHORT_NAME} falls back to the last used shell and then the first available shell.`}
        control={
          <div className="space-y-3">
            <Select
              value={defaultTerminalShellId || ""}
              onChange={(event) => updateDefaultTerminalShellId(event.target.value || null)}
            >
              <option value="">Use automatic selection</option>
              {availableShells.map((shell) => (
                <option key={shell.id} value={shell.id}>
                  {shell.label}
                </option>
              ))}
            </Select>
            <Button variant="outline" size="sm" onClick={() => updateDefaultTerminalShellId(null)} disabled={!defaultTerminalShellId}>
              Clear default shell
            </Button>
          </div>
        }
      />
      <SettingRow
        title="Quick Launch Defaults"
        description="Configure the values used by `New Terminal (Defaults)`."
        control={(
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">Terminal name</div>
              <Input
                value={appSettings.terminalQuickLaunchDefaults.name}
                placeholder="Terminal"
                onChange={(event) => {
                  updateTerminalQuickLaunchDefaults({
                    ...appSettings.terminalQuickLaunchDefaults,
                    name: event.target.value
                  });
                }}
                onBlur={(event) => {
                  const normalizedName = normalizeTerminalQuickLaunchName(event.target.value);
                  if (normalizedName === appSettings.terminalQuickLaunchDefaults.name) {
                    return;
                  }
                  updateTerminalQuickLaunchDefaults({
                    ...appSettings.terminalQuickLaunchDefaults,
                    name: normalizedName
                  });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">Attach to</div>
              <Select
                value={appSettings.terminalQuickLaunchDefaults.target}
                onChange={(event) => {
                  const nextTarget = event.target.value === "root" ? "root" : "session-default";
                  updateTerminalQuickLaunchDefaults({
                    ...appSettings.terminalQuickLaunchDefaults,
                    target: nextTarget
                  });
                }}
              >
                <option value="session-default">Session default</option>
                <option value="root">Repo root</option>
              </Select>
            </div>
          </div>
        )}
      />
      <div className="mt-6">
        <TerminalPresetsSettingsSection
          presets={appSettings.terminalPresets}
          terminalShells={availableShells}
          onChange={updateTerminalPresets}
        />
      </div>
    </div>
  );
}
