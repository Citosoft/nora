import { PanelTop } from "lucide-react";
import { useSettingsRuntime } from "@/components/app/hooks/useSettingsRuntime";
import { useIslandPreview } from "@/components/app/hooks/useIslandPreview";
import { SettingRow, SettingsSectionHeader, ToggleButton } from "@/components/app/panels/settings/settingsUi";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ISLAND_SIZES } from "@shared/island/contracts";
import type { IslandSize } from "@shared/types/island/island.types";

const SIZE_LABELS: Readonly<Record<IslandSize, string>> = { notch: "Notch (matches the notch)", medium: "Medium", large: "Large" };

function isIslandSize(value: string): value is IslandSize {
  return (ISLAND_SIZES as readonly string[]).includes(value);
}

/** macOS: the island around the MacBook notch that shows who is working and opens the inbox. */
export function NotchIslandSettingsSection() {
  const { appSettings, updateNotchIsland } = useSettingsRuntime();
  const settings = appSettings.notchIsland;
  const { preview, notice } = useIslandPreview();

  return <div className="max-w-4xl">
    <SettingsSectionHeader title="Notch island" icon={PanelTop}
      description="An island around the MacBook notch that shows who is working while threads and terminal agents run. Hover it to list them; click one to open it." />
    <SettingRow title="Show the notch island"
      description="Only Macs with a notch show it; on other displays nothing appears."
      control={<ToggleButton checked={settings.enabled} onChange={(enabled) => updateNotchIsland({ enabled })}
        label={settings.enabled ? "Enabled" : "Disabled"} accessibleName="Show the notch island" />} />
    <SettingRow title="Always show"
      description="Keep the island up when nothing is running, so its inbox button is always one click away. Off, it appears only while work is active."
      control={<ToggleButton checked={settings.alwaysShow} disabled={!settings.enabled} onChange={(alwaysShow) => updateNotchIsland({ alwaysShow })}
        label={settings.alwaysShow ? "Enabled" : "Disabled"} accessibleName="Always show the notch island" />} />
    <SettingRow title="Size"
      description="How large the island is. The smallest matches the notch; larger sizes grow taller and wider than it."
      control={<Select aria-label="Notch island size" value={settings.size} disabled={!settings.enabled}
        onChange={(event) => { if (isIslandSize(event.target.value)) updateNotchIsland({ size: event.target.value }); }}>
        {ISLAND_SIZES.map((size) => <option key={size} value={size}>{SIZE_LABELS[size]}</option>)}
      </Select>} />
    <SettingRow title="Preview"
      description="Show the island with sample threads at your chosen size, even when it is turned off: threads at work, or one waiting on you. It goes away after 20 seconds or when you leave this page."
      control={<div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => preview("running")}>Preview running</Button>
          <Button variant="outline" onClick={() => preview("needs-you")}>Preview needs you</Button>
        </div>
        {notice ? <p role="status" className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{notice.title}.</span> {notice.description}</p> : null}
      </div>} />
  </div>;
}
