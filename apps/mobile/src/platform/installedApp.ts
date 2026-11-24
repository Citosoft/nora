import { applicationId, nativeApplicationVersion, nativeBuildVersion } from "expo-application";
import type { InstalledAppInfo } from "@/types/appAbout.types";

/** Read the installed binary, not app.json from the replaceable JavaScript bundle. */
export const installedApp: InstalledAppInfo = { version: nativeApplicationVersion, build: nativeBuildVersion, applicationId };
