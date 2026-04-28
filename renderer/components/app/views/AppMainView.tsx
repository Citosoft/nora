import { useAppMainView } from "@/components/app/context/appMainViewContext";
import { AppMainChromeShell } from "@/components/app/views/AppMainChromeShell";

export function AppMainView() {
  const {
    titleBar,
    topBanners,
    showSettingsPage,
    settingsPage,
    signedInWorkspaceView,
    statusBar
  } = useAppMainView();

  return (
    <AppMainChromeShell
      titleBar={titleBar}
      topBanners={topBanners}
      mainScrollChildren={showSettingsPage ? settingsPage : signedInWorkspaceView}
      statusBar={statusBar}
    />
  );
}
