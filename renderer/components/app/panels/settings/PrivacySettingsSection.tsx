import { useSettingsRuntime } from "@/components/app/hooks/useSettingsRuntime";
import { SettingRow, SettingsSectionHeader, ToggleButton } from "@/components/app/panels/settings/settingsUi";
import { Shield } from "lucide-react";

export function PrivacySettingsSection() {
  const {
    appSettings,
    analyticsAllowedInCurrentRun,
    analyticsDevModeSwitch,
    updateAnalyticsConsent
  } = useSettingsRuntime();

  return (
    <div className="max-w-4xl">
      <SettingsSectionHeader
        title="Privacy"
        description="Control how diagnostic and usage data is handled."
        icon={Shield}
      />
      <SettingRow
        title="Usage Analytics"
        description={
          analyticsAllowedInCurrentRun
            ? "Allow anonymous usage analytics to help improve Nora. You can change this anytime."
            : `Analytics capture is disabled for this run. In development mode, relaunch with --${analyticsDevModeSwitch} to enable analytics capture while testing.`
        }
        control={
          <ToggleButton
            checked={appSettings.analyticsConsentStatus === "granted"}
            onChange={updateAnalyticsConsent}
            label={appSettings.analyticsConsentStatus === "granted" ? "Enabled" : "Disabled"}
          />
        }
      />
    </div>
  );
}
