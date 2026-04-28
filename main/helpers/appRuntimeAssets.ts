import { app, nativeImage, type NativeImage } from "electron";
import { isPathWithinComparableRoot } from "@shared/pathComparison";
import path from "node:path";

export function pathIsWithinAnyMount(projectPath: string, mountPoints: string[]): boolean {
  return mountPoints.some((mountPoint) =>
    isPathWithinComparableRoot(projectPath, mountPoint, { windows: process.platform === "win32" })
  );
}

export function getAppIcon(appDirname: string): NativeImage {
  const iconCandidates =
    process.platform === "win32"
      ? [path.join(appDirname, "..", "renderer", "icon.ico")]
      : process.platform === "darwin"
        ? [
            path.join(process.resourcesPath, "icon.icns"),
            path.join(appDirname, "..", "renderer", "icon.icns"),
            path.join(appDirname, "..", "renderer", "icon.png")
          ]
        : [path.join(appDirname, "..", "renderer", "icon-256.png"), path.join(appDirname, "..", "renderer", "icon.png")];

  for (const candidate of iconCandidates) {
    const icon = nativeImage.createFromPath(candidate);
    if (!icon.isEmpty()) {
      return icon;
    }
  }

  return nativeImage.createEmpty();
}

export function applyMacDockIcon(icon: NativeImage): void {
  if (process.platform !== "darwin" || !app.dock) {
    return;
  }

  if (!icon.isEmpty()) {
    app.dock.setIcon(icon);
  }
}
