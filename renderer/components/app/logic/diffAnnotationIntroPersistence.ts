const DIFF_ANNOTATION_INTRO_SEEN_STORAGE_KEY = "nora-diff-annotation-intro-seen";

export function readDiffAnnotationIntroSeen(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return window.localStorage.getItem(DIFF_ANNOTATION_INTRO_SEEN_STORAGE_KEY) === "true";
  } catch {
    return true;
  }
}

export function writeDiffAnnotationIntroSeen(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(DIFF_ANNOTATION_INTRO_SEEN_STORAGE_KEY, "true");
  } catch {
    // Ignore storage failures so opening a diff never depends on localStorage availability.
  }
}
