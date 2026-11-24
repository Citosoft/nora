import { useContext } from "react";
import { AppUpdateStatusContext } from "@/context/appUpdateStatusContext";
import type { AppUpdateStatus } from "@/types/appAbout.types";

export function useAppUpdateStatus(): AppUpdateStatus {
  const status = useContext(AppUpdateStatusContext);
  if (!status) throw new Error("Update status requires AppUpdateBoundary");
  return status;
}
