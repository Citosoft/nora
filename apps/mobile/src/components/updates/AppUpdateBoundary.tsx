import { AppUpdateStatusContext } from "@/context/appUpdateStatusContext";
import { Modal } from "react-native";
import type { AppUpdateBoundaryProps } from "@/types/appUpdate.types";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { AppUpdateScreen } from "@/components/screens/AppUpdateScreen";

/** Keep navigation and drafts mounted beneath the prompt until the user chooses to restart. */
export function AppUpdateBoundary({ children }: AppUpdateBoundaryProps) {
  const { screen, install, dismiss, status } = useAppUpdate();
  return <AppUpdateStatusContext.Provider value={status}>
    {children}
    {screen ? <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={dismiss}>
      <AppUpdateScreen state={screen} onInstall={install} onDismiss={dismiss} />
    </Modal> : null}
  </AppUpdateStatusContext.Provider>;
}
