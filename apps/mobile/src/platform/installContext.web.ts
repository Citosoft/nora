import type { InstallContext } from "@/types/platform.types";

/** Web: works out how to describe "Add to Home Screen" for this browser, or that the app is already installed. */
export function detectInstallContext(): InstallContext {
  if (typeof window === "undefined" || typeof navigator === "undefined") return { kind: "desktop" };
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches === true
    || ("standalone" in navigator && navigator.standalone === true);
  if (standalone) return { kind: "installed" };
  const agent = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(agent) || (agent.includes("Macintosh") && navigator.maxTouchPoints > 1);
  if (iOS) return /CriOS|FxiOS|EdgiOS/.test(agent) ? { kind: "ios-other-browser" } : { kind: "ios-safari" };
  if (/Android/.test(agent)) return { kind: "android" };
  return { kind: "desktop" };
}
