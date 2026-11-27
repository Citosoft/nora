import { ANALYTICS_DISCLOSURE } from "@/components/app/constants/analyticsDisclosure";
import { useSettingsRuntime } from "@/components/app/hooks/useSettingsRuntime";
import { SettingRow, SettingsSectionHeader, ToggleButton } from "@/components/app/panels/settings/settingsUi";
import { AnalyticsDisclosure } from "@/components/app/shared/AnalyticsDisclosure";
import { Shield } from "lucide-react";

export function PrivacySettingsSection() {
  const {
    appSettings,
    analyticsAllowedInCurrentRun,
    analyticsDevModeSwitch,
    usageStatisticsRequireConsent,
    updateUsageStatistics,
    updateAnalyticsConsent
  } = useSettingsRuntime();
  const statisticsOn = appSettings.usageStatisticsEnabled;
  const detailedOn = statisticsOn && appSettings.analyticsConsentStatus === "granted";

  return (
    <div className="max-w-4xl">
      <SettingsSectionHeader
        title="Privacy"
        description="Control the usage data Nora sends to help improve the app."
        icon={Shield}
      />
      {!analyticsAllowedInCurrentRun ? (
        <p className="mb-4 text-sm text-muted-foreground">
          {`Analytics is off for this development run. Relaunch with --${analyticsDevModeSwitch} to test it.`}
        </p>
      ) : null}
      <SettingRow
        title="Usage statistics"
        description={usageStatisticsRequireConsent
          ? "Counts of how Nora is used, tied to a random installation ID. In your region these are only sent once you also allow detailed analytics."
          : "Counts of how Nora is used, tied to a random installation ID rather than your account. Turning this off stops all analytics."}
        control={<ToggleButton checked={statisticsOn} onChange={updateUsageStatistics} label={statisticsOn ? "Enabled" : "Disabled"} accessibleName="Usage statistics" />}
      />
      <SettingRow
        title="Detailed analytics"
        description="Also share the screens and commands you use and scrubbed error messages. Off unless you turn it on."
        control={
          <ToggleButton
            checked={detailedOn}
            onChange={updateAnalyticsConsent}
            label={detailedOn ? "Enabled" : "Disabled"}
            accessibleName="Detailed analytics"
          />
        }
      />
      <div className="mt-4 rounded-md border border-border/70 p-4">
        <AnalyticsDisclosure sections={[
          { title: "Usage statistics", items: ANALYTICS_DISCLOSURE.statistics },
          { title: "Detailed analytics adds", items: ANALYTICS_DISCLOSURE.detailed }
        ]} />
      </div>
    </div>
  );
}
