import type { StatusBarContextValue } from "@/components/app/logic/statusBarContext";
import type { AppToast } from "@/components/app/types/appToast.types";

export type AppRootShellFrameValue = {
  statusBar: StatusBarContextValue;
  toasts: AppToast[];
  dismissToast: (toastId: number) => void;
};
