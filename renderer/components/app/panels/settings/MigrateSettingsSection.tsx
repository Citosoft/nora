import { useAppImportFlow } from "@/components/app/hooks/useAppImportFlow";
import { useSettingsRuntime } from "@/components/app/hooks/useSettingsRuntime";
import { AppImportFlowView } from "@/components/app/panels/app-import/AppImportFlowView";
import { SettingsCard, SettingsCardRow, SettingsSectionHeader } from "@/components/app/panels/settings/settingsUi";
import { ArrowRightLeft } from "lucide-react";

export function MigrateSettingsSection() {
  const { updateThemeMode } = useSettingsRuntime();
  const work = useAppImportFlow({ scope: "work", enabled: true, onThemeMode: updateThemeMode });
  const bots = useAppImportFlow({ scope: "bots", enabled: true, onThemeMode: updateThemeMode });
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <SettingsSectionHeader
          title="Migrate from another app"
          description="Bring your work and bots over from Claude, Codex, T3 Code, Orca, OpenBot and Grok Bot. Nora only reads the other apps' files, previews everything first, and skips what you've already imported."
          icon={ArrowRightLeft}
        />
      </div>
      <SettingsCard label="Migrate projects and settings">
        <SettingsCardRow title="Migrate from another app" description="Projects from Claude and Codex, and threads, setup scripts, presets, settings, appearance and shortcuts from T3 Code or Orca. A project several apps know about appears once." />
        <div className="px-5 py-4">
          <AppImportFlowView flow={work} />
        </div>
      </SettingsCard>
      <SettingsCard label="Migrate bots">
        <SettingsCardRow title="Migrate bots" description="Keep the bots you set up in Orca, OpenBot or Grok Bot, with their instructions and memory. Their routines arrive paused, so nothing runs until you turn it on." />
        <div className="px-5 py-4">
          <AppImportFlowView flow={bots} />
        </div>
      </SettingsCard>
    </div>
  );
}
