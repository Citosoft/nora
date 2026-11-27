import { useSettingsRuntime } from "@/components/app/hooks/useSettingsRuntime";
import { SettingRow, SettingsSectionHeader } from "@/components/app/panels/settings/settingsUi";
import { Button } from "@/components/ui/button";
import { useIslandPreview } from "@/components/app/hooks/useIslandPreview";
import { FlaskConical } from "lucide-react";

export function DevSettingsSection() {
  const { openOnboardingFlow, triggerDevToast } = useSettingsRuntime();
  const islandPreview = useIslandPreview();

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title="Developer"
        description="Internal preview controls for validating UI behavior in development builds."
        icon={FlaskConical}
      />
      <div className="divide-y divide-border/60 rounded-lg border border-border/70 bg-card px-5">
        <SettingRow
          title="Onboarding Flow"
          description="Reopen the first-run onboarding flow with the current project and settings data."
          control={(
            <Button variant="outline" onClick={openOnboardingFlow}>
              Open onboarding
            </Button>
          )}
        />
        <SettingRow
          title="Notch Island Demo"
          description="Show the notch island with sample threads for 20 seconds, or until you leave this page, even when it is turned off or nothing is running. Hover it to expand."
          control={(
            <div className="space-y-2">
              <Button variant="outline" onClick={() => islandPreview.preview("running")}>
                Show island demo
              </Button>
              {islandPreview.notice ? <p role="status" className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{islandPreview.notice.title}.</span> {islandPreview.notice.description}
              </p> : null}
            </div>
          )}
        />
        <SettingRow
          title="Preview Toast Styles"
          description="Trigger sample toasts to validate contrast, spacing, and typography before shipping UI changes."
          control={(
            <div className="grid gap-2">
              <Button
                variant="outline"
                onClick={() => triggerDevToast?.({
                  variant: "info",
                  title: "Dev info toast preview",
                  description: "This is how informational messages render."
                })}
              >
                Show info toast
              </Button>
              <Button
                variant="outline"
                onClick={() => triggerDevToast?.({
                  variant: "success",
                  title: "Dev success toast preview",
                  description: "This is how success confirmation messages render."
                })}
              >
                Show success toast
              </Button>
              <Button
                variant="outline"
                onClick={() => triggerDevToast?.({
                  variant: "error",
                  title: "Dev error toast preview",
                  description: "This is how error messages render."
                })}
              >
                Show error toast
              </Button>
            </div>
          )}
        />
      </div>
    </div>
  );
}
