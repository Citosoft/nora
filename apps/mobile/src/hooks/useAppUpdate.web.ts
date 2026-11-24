import Constants from "expo-constants";
import type { AppUpdateController } from "@/types/appUpdate.types";

/** Web uses its existing service-worker update lifecycle, never the native Expo updater. */
export function useAppUpdate(): AppUpdateController {
  return { screen: null, install: () => {}, dismiss: () => {},
    status: { info: { kind: "web", version: Constants.expoConfig?.version ?? null }, check: () => {} } };
}
