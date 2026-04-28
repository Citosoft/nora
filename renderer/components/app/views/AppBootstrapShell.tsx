import { StatusBarContext } from "@/components/app/logic/statusBarContext";
import type { AppBootstrapShellProps } from "@/components/app/types/appBootstrapShell.types";

export function AppBootstrapShell({
  statusBar,
  titleBar,
  topBanners,
  mainContent,
  footer
}: AppBootstrapShellProps) {
  return (
    <StatusBarContext.Provider value={statusBar}>
      <div className="flex h-screen flex-col">
        {titleBar}
        {topBanners}
        {mainContent}
        {footer}
      </div>
    </StatusBarContext.Provider>
  );
}
