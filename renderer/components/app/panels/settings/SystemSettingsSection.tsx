import { useSettingsRuntime } from "@/components/app/hooks/useSettingsRuntime";
import { SettingRow, SettingsSectionHeader, ToggleButton } from "@/components/app/panels/settings/settingsUi";
import { Button } from "@/components/ui/button";
import { Cpu } from "lucide-react";

export function SystemSettingsSection() {
  const {
    appSettings,
    updateHardwareAcceleration,
    relaunchApplication
  } = useSettingsRuntime();

  return (
    <div className="max-w-4xl">
      <SettingsSectionHeader
        title="System"
        description="Machine-level and runtime behavior settings."
        icon={Cpu}
      />
      <SettingRow
        title="Hardware Acceleration"
        description="Use GPU acceleration for rendering. Disable this on machines with Electron graphics issues. Changes apply after restarting the app."
        control={
          <div className="space-y-3">
            <ToggleButton
              checked={appSettings.hardwareAccelerationEnabled}
              onChange={updateHardwareAcceleration}
              label={appSettings.hardwareAccelerationEnabled ? "Enabled" : "Disabled"}
            />
            <Button variant="outline" size="sm" onClick={relaunchApplication}>
              Restart App
            </Button>
          </div>
        }
      />
    </div>
  );
}
