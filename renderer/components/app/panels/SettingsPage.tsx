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
import { WorkbenchSettingsSection } from "@/components/app/panels/settings/WorkbenchSettingsSection";
import type { SettingsGroup, SettingsPageProps } from "@/components/app/types/component.types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Bot,
  Cpu,
  FlaskConical,
  Globe,
  LayoutDashboard,
  Palette,
  Plug,
  Shield,
  SlidersHorizontal,
  Sparkles,
  TerminalSquare,
  type LucideIcon
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const SETTINGS_GROUP_ITEMS: { value: SettingsGroup; label: string; icon: LucideIcon }[] = [
  { value: "appearance", label: "Appearance", icon: Palette },
  { value: "general", label: "General", icon: SlidersHorizontal },
  { value: "workbench", label: "Workbench", icon: LayoutDashboard },
  { value: "terminal", label: "Terminal", icon: TerminalSquare },
  { value: "browser", label: "Browser", icon: Globe },
  { value: "cli", label: "Agents", icon: Bot },
  { value: "agentUsage", label: "Agent usage", icon: BarChart3 },
  { value: "skills", label: "Skills", icon: Sparkles },
  { value: "integrations", label: "Integrations", icon: Plug },
  { value: "ai", label: "AI", icon: Bot },
  { value: "privacy", label: "Privacy", icon: Shield },
  { value: "system", label: "System", icon: Cpu },
  ...(!__NORA_IS_PRODUCTION__ ? [{ value: "dev" as const, label: "Dev", icon: FlaskConical }] : [])
];

export function SettingsPage({ initialGroup }: SettingsPageProps) {
  const { closeSettingsPage } = useSettingsRuntime();
  const [group, setGroup] = useState<SettingsGroup>(initialGroup ?? "appearance");
  const previousInitialGroupRef = useRef<SettingsGroup | undefined>(initialGroup);

  useEffect(() => {
    if (initialGroup && initialGroup !== previousInitialGroupRef.current) {
      setGroup(initialGroup);
    }
    previousInitialGroupRef.current = initialGroup;
  }, [initialGroup]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-background">
      <div className="border-b border-border/60 px-8 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Preferences</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Settings</h1>
          </div>
          <Button variant="outline" onClick={closeSettingsPage}>
            Back
          </Button>
        </div>
      </div>

      <Tabs
        value={group}
        onValueChange={(value: string) => setGroup(value as SettingsGroup)}
        orientation="vertical"
        className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)]"
      >
        <div className="border-r border-border/60 bg-card/40 px-4 py-5">
          <TabsList className="flex w-full flex-col items-stretch gap-1 border-0 bg-transparent p-0">
            {SETTINGS_GROUP_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="w-full justify-start px-3 py-2 text-sm data-[state=active]:bg-accent data-[state=active]:text-foreground"
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <div className="min-h-0 overflow-y-auto px-8 py-6">
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
