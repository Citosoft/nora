import path from "node:path";
import type { App } from "electron";
import { configureNoraRoot } from "@main/noraPaths";
import type { AppProfile, AppProfileInput } from "@main/types/appProfile.types";

export function resolveAppProfile(input: AppProfileInput): AppProfile {
  if (input.isPackaged) return { kind: "installed", noraRoot: path.join(input.homeDirectory, ".nora") };
  return {
    kind: "development",
    noraRoot: path.join(input.homeDirectory, ".nora-dev"),
    // Matches the "<productName> Development" app bundle the dev script registers on macOS.
    userDataDirectory: path.join(input.appDataDirectory, `${input.productName} Development`)
  };
}

/**
 * Points Nora's state root and Electron's userData at this build's profile. Must run before anything reads
 * either location, and before the single-instance lock, which lives in userData: a shared lock would let a
 * running dev build swallow launches of the installed app.
 */
export function applyAppProfile(app: Pick<App, "isPackaged" | "getPath" | "setPath">, input: Omit<AppProfileInput, "isPackaged" | "appDataDirectory">): AppProfile {
  const profile = resolveAppProfile({ ...input, isPackaged: app.isPackaged, appDataDirectory: app.getPath("appData") });
  configureNoraRoot(profile.noraRoot);
  if (profile.kind === "development") app.setPath("userData", profile.userDataDirectory);
  return profile;
}
