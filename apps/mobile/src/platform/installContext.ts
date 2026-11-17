import type { InstallContext } from "@/types/platform.types";

export function detectInstallContext(): InstallContext {
  return { kind: "native" };
}
