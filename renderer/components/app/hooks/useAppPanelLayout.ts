import { useContext } from "react";
import { AppPanelLayoutContext } from "@/components/app/context/appPanelLayoutContext";

export function useAppPanelLayout() {
  return useContext(AppPanelLayoutContext);
}
