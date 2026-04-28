import { useSettingsRuntime } from "@/components/app/hooks/useSettingsRuntime";
import { SettingRow, SettingsSectionHeader, ToggleButton } from "@/components/app/panels/settings/settingsUi";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { APP_SHORT_NAME } from "@shared/appMeta";
import { Globe } from "lucide-react";

export function BrowserSettingsSection() {
  const {
    appSettings,
    updateOpenInternalBrowserOnNewPortDetection,
    chromeCookieProfiles,
    selectedChromeCookieProfileId,
    isLoadingChromeCookieProfiles,
    setSelectedChromeCookieProfileId,
    reloadChromeCookieProfiles,
    importChromeBrowserData
  } = useSettingsRuntime();

  return (
    <div className="max-w-4xl">
      <SettingsSectionHeader
        title="Browser"
        description={`Control how the internal browser behaves inside ${APP_SHORT_NAME}.`}
        icon={Globe}
      />

      <SettingRow
        title="Auto-open Browser On New Port"
        description="Open a new internal browser tab when a workspace terminal detects a new local URL."
        control={(
          <ToggleButton
            checked={appSettings.openInternalBrowserOnNewPortDetection}
            onChange={updateOpenInternalBrowserOnNewPortDetection}
            label={appSettings.openInternalBrowserOnNewPortDetection ? "Enabled" : "Disabled"}
          />
        )}
      />
      <SettingRow
        title="Import Chrome Cookies"
        description="Choose a local Chrome profile and import its cookies into Nora's internal browser session."
        control={(
          <div className="space-y-3">
            <Select
              value={selectedChromeCookieProfileId ?? ""}
              onChange={(event) => setSelectedChromeCookieProfileId(event.target.value)}
              disabled={isLoadingChromeCookieProfiles || chromeCookieProfiles.length === 0}
            >
              <option value="">Select profile</option>
              {chromeCookieProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.label} ({profile.totalCookies} cookies)
                </option>
              ))}
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={reloadChromeCookieProfiles} disabled={isLoadingChromeCookieProfiles}>
                Refresh Profiles
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!selectedChromeCookieProfileId) {
                    return;
                  }
                  importChromeBrowserData(selectedChromeCookieProfileId);
                }}
                disabled={!selectedChromeCookieProfileId}
              >
                {appSettings.browserDataImportPromptSeen ? "Import Cookies Again" : "Import Cookies"}
              </Button>
            </div>
          </div>
        )}
      />
    </div>
  );
}
