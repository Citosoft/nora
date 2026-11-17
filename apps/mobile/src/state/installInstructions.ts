import type { InstallContext } from "@/types/platform.types";

/** How to add the web app to the home screen in this browser, or null when it does not apply. */
export function installInstructions(context: InstallContext): string | null {
  switch (context.kind) {
    case "ios-safari": return "Tap the Share button, then “Add to Home Screen”.";
    case "ios-other-browser": return "Open this page in Safari, tap Share, then “Add to Home Screen”.";
    case "android": return "Open the browser menu (⋮) and choose “Install app” or “Add to Home screen”.";
    case "desktop": return "Use your browser's install button in the address bar, or bookmark this page.";
    case "native":
    case "installed":
      return null;
  }
}
