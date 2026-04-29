import { useSettingsRuntime } from "@/components/app/hooks/useSettingsRuntime";
import { SettingRow, SettingsSectionHeader, TerminalThemePreview, ToggleButton } from "@/components/app/panels/settings/settingsUi";
import type { AccentColor, TerminalFontId, TerminalThemeId } from "@/components/app/types";
import { Select } from "@/components/ui/select";
import { APP_SHORT_NAME } from "@shared/appMeta";
import type { FileEditorThemeId } from "@shared/appTypes";
import { Palette } from "lucide-react";

export function AppearanceSettingsSection() {
  const {
    themeMode,
    updateThemeMode,
    accentColor,
    updateAccentColor,
    terminalThemeId,
    updateTerminalTheme,
    terminalFontId,
    updateTerminalFont,
    appSettings,
    updateFileEditorThemeId,
    resolvedTheme,
    canPreviewMacTitleBarChrome,
    forceMacTitleBarPreview,
    updateForceMacTitleBarPreview
  } = useSettingsRuntime();

  return (
    <div className="max-w-4xl">
      <SettingsSectionHeader
        title="Appearance"
        description={`Control how ${APP_SHORT_NAME} looks across the application.`}
        icon={Palette}
      />

      <SettingRow
        title="Color Theme"
        description={`Choose whether ${APP_SHORT_NAME} follows the system appearance or uses a fixed light or dark theme.`}
        control={
          <Select value={themeMode} onChange={(event) => updateThemeMode(event.target.value as "system" | "light" | "dark")}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </Select>
        }
      />
      <SettingRow
        title="Accent Color"
        description="Control the app-wide accent used for active states, primary actions, highlights, icons, and focus rings."
        control={
          <div className="space-y-3">
            <Select value={accentColor} onChange={(event) => updateAccentColor(event.target.value as AccentColor)}>
              <option value="silver">Silver</option>
              <option value="green">Green</option>
              <option value="blue">Blue</option>
              <option value="amber">Amber</option>
              <option value="rose">Rose</option>
              <option value="violet">Violet</option>
            </Select>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "silver", className: "bg-[hsl(220_9%_46%)]" },
                { value: "green", className: "bg-[hsl(161_67%_37%)]" },
                { value: "blue", className: "bg-[hsl(213_79%_47%)]" },
                { value: "amber", className: "bg-[hsl(32_95%_45%)]" },
                { value: "rose", className: "bg-[hsl(346_78%_47%)]" },
                { value: "violet", className: "bg-[hsl(262_73%_54%)]" }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateAccentColor(option.value as AccentColor)}
                  className={[
                    "h-8 w-8 rounded-full border transition",
                    option.className,
                    accentColor === option.value ? "border-foreground scale-105" : "border-border/70"
                  ].join(" ")}
                  aria-label={`Use ${option.value} accent color`}
                  title={option.value}
                />
              ))}
            </div>
          </div>
        }
      />
      <SettingRow
        title="File Editor Theme"
        description="Choose the Monaco theme family used by the file editor. The editor stays in sync with the app's current light or dark mode."
        control={
          <Select
            value={appSettings.fileEditorThemeId}
            onChange={(event) => updateFileEditorThemeId(event.target.value as FileEditorThemeId)}
          >
            <option value="default">Default</option>
            <option value="high-contrast">High Contrast</option>
          </Select>
        }
      />
      <SettingRow
        title="Terminal Theme"
        description="Choose the terminal palette used by agent and shell sessions."
        control={
          <div className="space-y-3">
            <Select value={terminalThemeId} onChange={(event) => updateTerminalTheme(event.target.value as TerminalThemeId)}>
              <option value="app">Match app</option>
              <option value="vscode-dark">VS Code Dark</option>
              <option value="dracula">Dracula</option>
              <option value="solarized-dark">Solarized Dark</option>
              <option value="solarized-light">Solarized Light</option>
            </Select>
            <TerminalThemePreview
              terminalThemeId={terminalThemeId}
              terminalFontId={terminalFontId}
              resolvedTheme={resolvedTheme}
            />
          </div>
        }
      />
      <SettingRow
        title="Terminal Font"
        description="Choose the monospace font used by live terminal sessions and the terminal preview."
        control={
          <div className="space-y-3">
            <Select value={terminalFontId} onChange={(event) => updateTerminalFont(event.target.value as TerminalFontId)}>
              <option value="ibm-plex-mono">IBM Plex Mono</option>
              <option value="jetbrains-mono">JetBrains Mono</option>
              <option value="fira-code">Fira Code</option>
              <option value="cascadia-mono">Cascadia Mono</option>
              <option value="source-code-pro">Source Code Pro</option>
              <option value="space-mono">Space Mono</option>
            </Select>
          </div>
        }
      />
      {canPreviewMacTitleBarChrome ? (
        <SettingRow
          title="macOS Title Bar Preview"
          description="Developer preview mode: render the macOS traffic-light title bar chrome on this machine."
          control={
            <ToggleButton
              checked={forceMacTitleBarPreview}
              onChange={updateForceMacTitleBarPreview}
              label={forceMacTitleBarPreview ? "Enabled" : "Disabled"}
            />
          }
        />
      ) : null}
    </div>
  );
}
