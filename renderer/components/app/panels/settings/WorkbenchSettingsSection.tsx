import { useSettingsRuntime } from "@/components/app/hooks/useSettingsRuntime";
import { SettingRow, SettingsSectionHeader, ToggleButton } from "@/components/app/panels/settings/settingsUi";
import { Select } from "@/components/ui/select";
import { APP_SHORT_NAME } from "@shared/appMeta";
import type { AppSettings } from "@shared/appTypes";
import { LayoutDashboard } from "lucide-react";

export function WorkbenchSettingsSection() {
  const {
    workbenchLayout,
    updateWorkbenchLayout,
    appSettings,
    updateDefaultSplitViewGrid,
    updateRememberLastSplitViewPerWorkspace,
    updateConfirmSplitViewDelete,
    updateShowWorkspaceSessionTabs
  } = useSettingsRuntime();

  return (
    <div className="max-w-4xl">
      <SettingsSectionHeader
        title="Workbench"
        description={`Tune workspace layout and view behavior in ${APP_SHORT_NAME}.`}
        icon={LayoutDashboard}
      />
      <SettingRow
        title="Workspace Sidebar"
        description="Start with the workspace sidebar collapsed."
        control={
          <ToggleButton
            checked={workbenchLayout.isWorkspaceSidebarCollapsed}
            onChange={(checked) => updateWorkbenchLayout({ isWorkspaceSidebarCollapsed: checked })}
            label={workbenchLayout.isWorkspaceSidebarCollapsed ? "Collapsed" : "Expanded"}
          />
        }
      />
      <SettingRow
        title="Changes Panel"
        description="Start with the changes panel collapsed."
        control={
          <ToggleButton
            checked={workbenchLayout.isChangesSidebarCollapsed}
            onChange={(checked) => updateWorkbenchLayout({ isChangesSidebarCollapsed: checked })}
            label={workbenchLayout.isChangesSidebarCollapsed ? "Collapsed" : "Expanded"}
          />
        }
      />
      <SettingRow
        title="Remote Mounts Section"
        description="Keep the remote mounts section collapsed in the workspace sidebar."
        control={
          <ToggleButton
            checked={workbenchLayout.isRemoteMountsSectionCollapsed}
            onChange={(checked) => updateWorkbenchLayout({ isRemoteMountsSectionCollapsed: checked })}
            label={workbenchLayout.isRemoteMountsSectionCollapsed ? "Collapsed" : "Expanded"}
          />
        }
      />
      <SettingRow
        title="Active Ports Section"
        description="Keep the active ports section collapsed in the workspace sidebar."
        control={
          <ToggleButton
            checked={workbenchLayout.isPortsSectionCollapsed}
            onChange={(checked) => updateWorkbenchLayout({ isPortsSectionCollapsed: checked })}
            label={workbenchLayout.isPortsSectionCollapsed ? "Collapsed" : "Expanded"}
          />
        }
      />
      <SettingRow
        title="AI Chatbots Section"
        description="Keep the AI chatbot shortcuts section collapsed in the workspace sidebar."
        control={
          <ToggleButton
            checked={workbenchLayout.isChatbotsSectionCollapsed}
            onChange={(checked) => updateWorkbenchLayout({ isChatbotsSectionCollapsed: checked })}
            label={workbenchLayout.isChatbotsSectionCollapsed ? "Collapsed" : "Expanded"}
          />
        }
      />
      <SettingRow
        title="Agent CLIs Section"
        description="Keep the agent CLI section collapsed in the workspace sidebar."
        control={
          <ToggleButton
            checked={workbenchLayout.isCliSectionCollapsed}
            onChange={(checked) => updateWorkbenchLayout({ isCliSectionCollapsed: checked })}
            label={workbenchLayout.isCliSectionCollapsed ? "Collapsed" : "Expanded"}
          />
        }
      />
      <SettingRow
        title="Specs Section"
        description="Keep the specs section collapsed in the workspace sidebar."
        control={
          <ToggleButton
            checked={workbenchLayout.isSpecsSectionCollapsed}
            onChange={(checked) => updateWorkbenchLayout({ isSpecsSectionCollapsed: checked })}
            label={workbenchLayout.isSpecsSectionCollapsed ? "Collapsed" : "Expanded"}
          />
        }
      />
      <SettingRow
        title="Local Terminal Dock"
        description="Start with the bottom local terminal dock collapsed."
        control={
          <ToggleButton
            checked={workbenchLayout.isLocalTerminalDockCollapsed}
            onChange={(checked) => updateWorkbenchLayout({ isLocalTerminalDockCollapsed: checked })}
            label={workbenchLayout.isLocalTerminalDockCollapsed ? "Collapsed" : "Expanded"}
          />
        }
      />
      <SettingRow
        title="Default Split View Grid"
        description="Choose the grid preset new split views start with."
        control={
          <Select
            value={`${appSettings.defaultSplitViewGridColumns}x${appSettings.defaultSplitViewGridRows}`}
            onChange={(event) => {
              const [gridColumns, gridRows] = event.target.value.split("x").map((value) => Number.parseInt(value, 10));
              updateDefaultSplitViewGrid(
                gridColumns as AppSettings["defaultSplitViewGridColumns"],
                gridRows as AppSettings["defaultSplitViewGridRows"]
              );
            }}
          >
            <option value="1x2">1 x 2</option>
            <option value="2x2">2 x 2</option>
            <option value="3x2">3 x 2</option>
            <option value="4x2">4 x 2</option>
          </Select>
        }
      />
      <SettingRow
        title="Remember Last Split View"
        description="Reopen each workspace with its last active split view instead of always returning to the focused session."
        control={
          <ToggleButton
            checked={appSettings.rememberLastSplitViewPerWorkspace}
            onChange={updateRememberLastSplitViewPerWorkspace}
            label={appSettings.rememberLastSplitViewPerWorkspace ? "Enabled" : "Disabled"}
          />
        }
      />
      <SettingRow
        title="Confirm Split View Delete"
        description="Ask for confirmation before deleting a saved split view."
        control={
          <ToggleButton
            checked={appSettings.confirmSplitViewDelete}
            onChange={updateConfirmSplitViewDelete}
            label={appSettings.confirmSplitViewDelete ? "Enabled" : "Disabled"}
          />
        }
      />
      <SettingRow
        title="Workspace Session Tabs"
        description="Show agent and terminal tabs above the main workspace panel."
        control={
          <ToggleButton
            checked={appSettings.showWorkspaceSessionTabs}
            onChange={updateShowWorkspaceSessionTabs}
            label={appSettings.showWorkspaceSessionTabs ? "Enabled" : "Disabled"}
          />
        }
      />
    </div>
  );
}
