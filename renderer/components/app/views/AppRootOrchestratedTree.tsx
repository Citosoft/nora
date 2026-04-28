import { AppMainViewProvider } from "@/components/app/context/appMainViewContext";
import { AppModalDialogsProvider } from "@/components/app/context/appModalDialogsContext";
import { useAppRootShellFrame } from "@/components/app/context/appRootShellFrameContext";
import { useChromeShellPorts } from "@/components/app/hooks/useChromeShellPorts";
import { useAppChromeComposition } from "@/components/app/hooks/useAppChromeComposition";
import { useAppMainViewValue } from "@/components/app/hooks/useAppMainViewValue";
import { useAppModalDialogsValue } from "@/components/app/hooks/useAppModalDialogsValue";
import { useSettingsRuntimeValue } from "@/components/app/hooks/useSettingsRuntimeValue";
import { StatusBarContext } from "@/components/app/logic/statusBarContext";
import { AppMainView } from "@/components/app/views/AppMainView";
import { AppModalDialogs } from "@/components/app/views/AppModalDialogs";
import { AppToastStack } from "@/components/app/views/AppToastStack";
import { useSignedInWorkspaceViewMount } from "@/components/app/views/signedInWorkspaceViewMount";
import { ToastViewport } from "@/components/ui/toast";
import type { ReactElement } from "react";

export function AppRootOrchestratedTree(): ReactElement {
  const chrome = useChromeShellPorts().compose;
  const { statusBar, toasts, dismissToast } = useAppRootShellFrame();

  const appModalDialogsValue = useAppModalDialogsValue();
  const settingsRuntimeValue = useSettingsRuntimeValue();

  const signedInWorkspaceView = useSignedInWorkspaceViewMount();

  const appChromeComposition = useAppChromeComposition({
    titleBar: chrome.titleBar,
    topBanners: chrome.topBanners,
    statusBar: chrome.statusBarChrome,
    settings: {
      runtimeValue: settingsRuntimeValue,
      initialGroup: chrome.settingsGroup
    }
  });

  const appMainViewValue = useAppMainViewValue({
    titleBar: appChromeComposition.titleBar,
    topBanners: appChromeComposition.topBanners,
    showSettingsPage: chrome.titleBar.activeView === "settings",
    settingsPage: appChromeComposition.settingsPage,
    signedInWorkspaceView,
    statusBar: appChromeComposition.statusBar
  });

  return (
    <StatusBarContext.Provider value={statusBar}>
      <AppModalDialogsProvider value={appModalDialogsValue}>
        <>
          <AppMainViewProvider value={appMainViewValue}>
            <AppMainView />
          </AppMainViewProvider>

          <AppModalDialogs />
          <AppToastStack toasts={toasts} onDismiss={dismissToast} />
          <ToastViewport />
        </>
      </AppModalDialogsProvider>
    </StatusBarContext.Provider>
  );
}
