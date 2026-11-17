import { isNewerVersion } from "@main/helpers/semanticVersion";
import type { CheckProviderUpdates, ProviderUpdateCheckerDeps } from "@main/types/providerUpdates.types";
import type { ProviderUpdateNotice } from "@shared/types/provider/update.types";

/**
 * Compares each detected provider CLI against its published release. Providers without a known
 * release source, or whose versions cannot be read, are skipped rather than reported.
 */
export function createProviderUpdateChecker(deps: ProviderUpdateCheckerDeps): CheckProviderUpdates {
  return async (detections) => {
    const checks = detections.map(async (detection): Promise<ProviderUpdateNotice | null> => {
      const definition = deps.definitions.find((entry) => entry.id === detection.id);
      if (!detection.detected || !detection.detectedPath || !definition?.npmPackage) return null;
      const [installedVersion, latestVersion] = await Promise.all([
        deps.readInstalledVersion(detection.detectedPath),
        deps.fetchLatestVersion(definition.npmPackage)
      ]);
      if (!installedVersion || !latestVersion || !isNewerVersion(installedVersion, latestVersion)) return null;
      return { toolId: definition.id, label: definition.label, installedVersion, latestVersion };
    });
    return (await Promise.all(checks)).filter((notice): notice is ProviderUpdateNotice => notice !== null);
  };
}
