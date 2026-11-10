import { useAppMainView } from "@/components/app/context/appMainViewContext";
import { AppMainChromeShell } from "@/components/app/views/AppMainChromeShell";

export function AppMainView() {
  const {
    titleBar,
    topBanners,
    signedInWorkspaceView
  } = useAppMainView();

  return (
    <AppMainChromeShell
      titleBar={titleBar}
      topBanners={topBanners}
      mainScrollChildren={signedInWorkspaceView}
    />
  );
}
