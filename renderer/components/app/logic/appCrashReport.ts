import type { AppCrashDetails } from "@/components/app/types/appErrorBoundary.types";

/** Normalizes anything thrown during render into displayable crash details. */
export function toAppCrashDetails(error: unknown, componentStack: string | null = null): AppCrashDetails {
  if (error instanceof Error) {
    return {
      message: error.message || error.name || "Unknown error",
      stack: error.stack ?? null,
      componentStack: componentStack?.trim() || null
    };
  }

  return {
    message: typeof error === "string" && error.length > 0 ? error : "Unknown error",
    stack: null,
    componentStack: componentStack?.trim() || null
  };
}

/** Plain-text report for the clipboard so users can paste it into an issue. */
export function formatAppCrashReport(crash: AppCrashDetails): string {
  const sections = [`Error: ${crash.message}`];
  if (crash.stack) {
    sections.push(`Stack:\n${crash.stack}`);
  }
  if (crash.componentStack) {
    sections.push(`Component stack:\n${crash.componentStack}`);
  }
  return sections.join("\n\n");
}
