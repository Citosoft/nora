import { useSettingRowReveal } from "@/components/app/hooks/useSettingRowReveal";
import { useSettingsRuntime } from "@/components/app/hooks/useSettingsRuntime";
import { AiSettingsSection } from "@/components/app/panels/settings/AiSettingsSection";
import { AppearanceSettingsSection } from "@/components/app/panels/settings/AppearanceSettingsSection";
import { BrowserSettingsSection } from "@/components/app/panels/settings/BrowserSettingsSection";
import { CliSettingsSection } from "@/components/app/panels/settings/CliSettingsSection";
import { DevSettingsSection } from "@/components/app/panels/settings/DevSettingsSection";
import { GeneralSettingsSection } from "@/components/app/panels/settings/GeneralSettingsSection";
import { IntegrationsSettingsSection } from "@/components/app/panels/settings/IntegrationsSettingsSection";
import { PrivacySettingsSection } from "@/components/app/panels/settings/PrivacySettingsSection";
import { SkillsSettingsSection } from "@/components/app/panels/settings/SkillsSettingsSection";
import { SystemSettingsSection } from "@/components/app/panels/settings/SystemSettingsSection";
import { TerminalSettingsSection } from "@/components/app/panels/settings/TerminalSettingsSection";
import { AgentUsageStatsSection } from "@/components/app/panels/settings/AgentUsageStatsSection";
import { VoiceSettingsSection } from "@/components/app/panels/settings/VoiceSettingsSection";
import { WorkbenchSettingsSection } from "@/components/app/panels/settings/WorkbenchSettingsSection";
import { SettingsSidebar } from "@/components/app/panels/settings/SettingsSidebar";
import type { SettingsGroup, SettingsPageProps } from "@/components/app/types/component.types";
import type { SettingRowRevealTarget, SettingsSearchEntry } from "@/components/app/types/settingsSearch.types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export function SettingsPage({ initialGroup }: SettingsPageProps) {
  const { closeSettingsPage } = useSettingsRuntime();
  const [group, setGroup] = useState<SettingsGroup>(initialGroup ?? "appearance");
  const previousInitialGroupRef = useRef<SettingsGroup | undefined>(initialGroup);
  const contentRef = useRef<HTMLDivElement>(null);
  const [revealTarget, setRevealTarget] = useState<SettingRowRevealTarget | null>(null);
  useSettingRowReveal(contentRef, group, revealTarget);

  const revealSetting = useCallback((entry: SettingsSearchEntry) => {
    setGroup(entry.group);
    setRevealTarget((previous) => ({ group: entry.group, title: entry.title, requestId: (previous?.requestId ?? 0) + 1 }));
  }, []);

  useEffect(() => {
    if (initialGroup && initialGroup !== previousInitialGroupRef.current) {
      setGroup(initialGroup);
    }
    previousInitialGroupRef.current = initialGroup;
  }, [initialGroup]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-background">
      <div className="border-b border-border/60 px-8 py-4">
        <Button variant="outline" onClick={closeSettingsPage}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </Button>
      </div>

      <Tabs
        value={group}
        onValueChange={(value: string) => setGroup(value as SettingsGroup)}
        orientation="vertical"
        className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)]"
      >
        <SettingsSidebar activeGroup={group} onSelectGroup={setGroup} onRevealSetting={revealSetting} />

        <div ref={contentRef} className="min-h-0 overflow-y-auto px-8 py-6">
          <TabsContent value="appearance" className="mt-0">
            <AppearanceSettingsSection />
          </TabsContent>

          <TabsContent value="general" className="mt-0">
            <GeneralSettingsSection />
          </TabsContent>

          <TabsContent value="workbench" className="mt-0">
            <WorkbenchSettingsSection />
          </TabsContent>

          <TabsContent value="terminal" className="mt-0">
            <TerminalSettingsSection />
          </TabsContent>

          <TabsContent value="browser" className="mt-0">
            <BrowserSettingsSection />
          </TabsContent>

          <TabsContent value="cli" className="mt-0">
            <CliSettingsSection />
          </TabsContent>

          <TabsContent value="agentUsage" className="mt-0">
            <AgentUsageStatsSection />
          </TabsContent>

          <TabsContent value="skills" className="mt-0">
            <SkillsSettingsSection />
          </TabsContent>

          <TabsContent value="integrations" className="mt-0">
            <IntegrationsSettingsSection />
          </TabsContent>

          <TabsContent value="ai" className="mt-0">
            <AiSettingsSection />
          </TabsContent>

          <TabsContent value="voice" className="mt-0">
            <VoiceSettingsSection />
          </TabsContent>

          <TabsContent value="privacy" className="mt-0">
            <PrivacySettingsSection />
          </TabsContent>

          <TabsContent value="system" className="mt-0">
            <SystemSettingsSection />
          </TabsContent>

          {!__NORA_IS_PRODUCTION__ ? (
            <TabsContent value="dev" className="mt-0">
              <DevSettingsSection />
            </TabsContent>
          ) : null}
        </div>
      </Tabs>
    </div>
  );
}
