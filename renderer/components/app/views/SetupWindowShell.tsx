import { TitleBarControls } from "@/components/app/chrome/TitleBarControls";
import { useWindowUiState } from "@/components/app/hooks/useWindowUiState";
import { AppMark } from "@/components/app/shared/AppMark";
import type { SetupWindowShellProps } from "@/components/app/types/windowChrome.types";

/** Startup screens live outside the workspace shell but still need frameless-window chrome. */
export function SetupWindowShell({ children }: SetupWindowShellProps) {
  const state = useWindowUiState();
  const useMacTitleBarChrome = state.platform === "darwin";

  return (
    <div className="setup-window-shell relative isolate flex h-screen flex-col overflow-clip text-foreground">
      <header className="app-drag flex h-12 shrink-0 select-none items-center">
        {useMacTitleBarChrome && <TitleBarControls useMacTitleBarChrome isMaximized={state.isMaximized} iconToneClass="text-muted-foreground" />}
        <div className="pointer-events-none flex items-center gap-2 px-4 text-xs font-medium text-muted-foreground">
          <AppMark className="size-4" />
          Nora
        </div>
        <div className="flex-1" />
        {!useMacTitleBarChrome && <TitleBarControls useMacTitleBarChrome={false} isMaximized={state.isMaximized} iconToneClass="text-muted-foreground" />}
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
