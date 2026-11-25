import { UI_FONT_SIZES } from "@shared/appearance/fontSize";
import { ACCENT_COLOR_OPTIONS } from "@/components/app/logic/accentColors";
import { getUiFontFamily, UI_FONT_OPTIONS } from "@/components/app/logic/appUiFonts";
import { useSettingsRuntime } from "@/components/app/hooks/useSettingsRuntime";
import { ColorThemePicker } from "@/components/app/panels/settings/ColorThemePicker";
import { SettingRow, SettingsSectionHeader, TerminalThemePreview, ToggleButton } from "@/components/app/panels/settings/settingsUi";
import type { AccentColor, TerminalFontId, TerminalThemeId, UiFontId } from "@/components/app/types";
import { Select } from "@/components/ui/select";
import { APP_SHORT_NAME } from "@shared/appMeta";
import { availableThreadBackdrop } from "@shared/thread-backdrop/settings";
import type { FileEditorThemeId } from "@shared/appTypes";
import { Palette } from "lucide-react";

export function AppearanceSettingsSection() {
  const {
    themeMode,
    updateThemeMode,
    workbenchLayout,
    updateWorkbenchLayout,
    accentColor,
    updateAccentColor,
    uiFontId,
    updateUiFont,
    updateUiFontSize,
    terminalThemeId,
    updateTerminalTheme,
    terminalFontId,
    updateTerminalFont,
    appSettings,
    updateFileEditorThemeId,
    updateThreadBackdrop,
    resolvedTheme,
    canPreviewMacTitleBarChrome,
    forceMacTitleBarPreview,
    updateForceMacTitleBarPreview
  } = useSettingsRuntime();
  const backdropAvailable = availableThreadBackdrop(appSettings) !== null;

  return (
    <div className="max-w-4xl">
      <SettingsSectionHeader
        title="Appearance"
        description={`Control how ${APP_SHORT_NAME} looks across the application.`}
        icon={Palette}
      />

      <SettingRow
        title="Sidebar layout"
        description="Swap the projects sidebar and Changes sidebar so the projects list sits on the right."
        control={
          <ToggleButton
            checked={workbenchLayout.sidebarsSwapped}
            onChange={(checked) => updateWorkbenchLayout({ sidebarsSwapped: checked })}
            label={workbenchLayout.sidebarsSwapped ? "Projects on the right" : "Projects on the left"}
          />
        }
      />
      <SettingRow
        title="Theme"
        description="Choose the color palette for backgrounds, text and borders. Every theme has a light and dark variant."
        control={<ColorThemePicker />}
      />
      <SettingRow
        title="Mode"
        description={`Choose whether ${APP_SHORT_NAME} follows the system appearance or always uses your theme's light or dark variant.`}
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
        description="Control the app-wide accent used for active states, primary actions, highlights, icons, and focus rings. Theme uses the selected theme's own accent, and picking a theme switches back to it."
        control={
          <div className="space-y-3">
            <Select value={accentColor} onChange={(event) => updateAccentColor(event.target.value as AccentColor)}>
              {ACCENT_COLOR_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </Select>
            <div className="flex flex-wrap gap-2">
              {ACCENT_COLOR_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => updateAccentColor(option.id)}
                  className={[
                    "h-8 w-8 rounded-full border transition",
                    option.swatchClassName,
                    accentColor === option.id ? "border-foreground scale-105" : "border-border/70"
                  ].join(" ")}
                  aria-label={`Use ${option.label} accent color`}
                  title={option.label}
                />
              ))}
            </div>
          </div>
        }
      />
      <SettingRow
        title="UI Font"
        description={`Choose the typeface used across ${APP_SHORT_NAME}'s interface. System uses your device's native font. SF Pro uses Apple's San Francisco font where available. Inter and Geist are bundled locally; other choices use web fonts when available.`}
        control={
          <div className="space-y-3">
            <Select value={uiFontId} onChange={(event) => updateUiFont(event.target.value as UiFontId)}>
              {UI_FONT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
            <div
              className="rounded-lg border border-border/70 bg-background px-3 py-2.5 text-sm text-foreground"
              style={{ fontFamily: `${getUiFontFamily(uiFontId)}, var(--app-system-font)` }}
            >
              The quick brown fox jumps over the lazy dog.
            </div>
          </div>
        }
      />
      <SettingRow
        title="UI font size"
        description="Adjust the text size across the app."
        control={<Select aria-label="UI font size" value={appSettings.uiFontSize} onChange={(event) => updateUiFontSize(Number(event.target.value))}>
          {UI_FONT_SIZES.map((size) => <option key={size} value={size}>{size} px</option>)}
        </Select>}
      />
      <SettingRow
        title="Animated thread background"
        description={backdropAvailable
          ? "Draw a slowly drifting pixel terrain behind threads. Pauses when the window is hidden and stays still with reduced motion."
          : "Unavailable while hardware acceleration is disabled in System settings."}
        control={
          <ToggleButton
            checked={backdropAvailable && appSettings.threadBackdrop.animated}
            onChange={(animated) => updateThreadBackdrop({ animated })}
            label={backdropAvailable && appSettings.threadBackdrop.animated ? "Enabled" : "Disabled"}
            accessibleName="Animated thread background"
            disabled={!backdropAvailable}
          />
        }
      />
      {backdropAvailable && appSettings.threadBackdrop.animated ? (
        <SettingRow
          title="Show background on"
          description="New threads only keeps the terrain behind the greeting; all threads also show it behind conversations."
          control={
            <Select
              value={appSettings.threadBackdrop.scope}
              onChange={(event) => updateThreadBackdrop({ scope: event.target.value === "all" ? "all" : "new" })}
            >
              <option value="new">New threads</option>
              <option value="all">All threads</option>
            </Select>
          }
        />
      ) : null}
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
