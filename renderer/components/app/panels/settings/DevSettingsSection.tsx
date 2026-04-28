import { useSettingsRuntime } from "@/components/app/hooks/useSettingsRuntime";
import { SettingRow, SettingsSectionHeader } from "@/components/app/panels/settings/settingsUi";
import { Button } from "@/components/ui/button";
import { FlaskConical } from "lucide-react";

export function DevSettingsSection() {
  const { triggerDevToast } = useSettingsRuntime();

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title="Developer"
        description="Internal preview controls for validating UI behavior in development builds."
        icon={FlaskConical}
      />
      <div className="divide-y divide-border/60 rounded-[6px] border border-border/70 bg-card/35 px-5">
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
