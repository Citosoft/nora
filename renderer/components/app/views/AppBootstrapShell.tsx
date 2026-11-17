import { StatusBarContext } from "@/components/app/logic/statusBarContext";
import type { AppBootstrapShellProps } from "@/components/app/types/appBootstrapShell.types";

export function AppBootstrapShell({
  statusBar,
  titleBar,
  topBanners,
  mainContent,
  activity,
  appTools
}: AppBootstrapShellProps) {
  return (
    <StatusBarContext.Provider value={statusBar}>
      <div className="flex h-screen flex-col">
        {titleBar}
        {topBanners}
        {activity}
        <div className="flex min-h-0 flex-1">
          <aside aria-label="App utilities" className="flex w-12 shrink-0 flex-col justify-end border-r border-border/50 p-1 pb-3">{appTools}</aside>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">{mainContent}</div>
        </div>
      </div>
    </StatusBarContext.Provider>
  );
}
