import type { UpdateScreenCopy, UpdateScreenState } from "@/types/appUpdate.types";

export function describeAppUpdate(state: UpdateScreenState): UpdateScreenCopy {
  switch (state.kind) {
    case "available": return { title: "Update available", message: "A new version of Nora is ready. Update now to get the latest improvements.",
      actionLabel: state.downloaded ? "Restart and update" : "Update now", dismissible: true };
    case "downloading": return { title: "Updating Nora", message: state.installing
      ? "Downloading the latest version. Nora will restart when your update is ready."
      : "Downloading the latest version. You can restart into the update as soon as it’s ready.",
      actionLabel: "", dismissible: !state.installing };
    case "restarting": return { title: "Restarting Nora…", message: "Opening the latest version. This will only take a moment.",
      actionLabel: "", dismissible: false };
    case "error": return { title: "Couldn’t update Nora", message: state.phase === "downloading"
      ? "The update couldn’t download. Check your connection and try again. You can keep using Nora for now."
      : "Nora couldn’t restart. Try again to open the downloaded update.", actionLabel: "Try again", dismissible: true };
  }
}
