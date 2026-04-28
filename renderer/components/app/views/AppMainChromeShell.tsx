import type { AppMainChromeShellProps } from "@/components/app/types/component.types";

export const AppMainChromeShell = ({
  titleBar,
  topBanners,
  mainScrollChildren,
  statusBar
}: AppMainChromeShellProps) => (
  <div className="flex h-screen flex-col">
    {titleBar}
    {topBanners}
    <div className="min-h-0 flex-1 overflow-auto">{mainScrollChildren}</div>
    {statusBar}
  </div>
);
