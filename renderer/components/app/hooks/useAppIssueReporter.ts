import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { APP_SUBMIT_ISSUE_URL, APP_VERSION } from "@shared/appMeta";
import { useCallback } from "react";

export function useAppIssueReporter(captureError: (error: unknown) => void): { handleSubmitIssue: () => void } {
  const handleSubmitIssue = useCallback(() => {
    const title = "Bug report: ";
    const bodyLines = [
      "## Summary",
      "<What happened?>",
      "",
      "## Steps To Reproduce",
      "1. ",
      "2. ",
      "3. ",
      "",
      "## Expected Behavior",
      "<What did you expect to happen?>",
      "",
      "## Actual Behavior",
      "<What actually happened?>",
      "",
      "## Environment",
      `- Nora version: ${APP_VERSION}`,
      `- Platform: ${navigator.platform || "unknown"}`,
      `- User agent: ${navigator.userAgent}`,
      `- Screen: ${window.screen.width}x${window.screen.height}`,
      `- Device pixel ratio: ${window.devicePixelRatio}`,
      "",
      "## Additional Context",
      "<Logs, screenshots, or extra details>"
    ];
    const params = new URLSearchParams({
      title,
      body: bodyLines.join("\n")
    });
    void noraSystemClient.openExternalUrl(`${APP_SUBMIT_ISSUE_URL}?${params.toString()}`).catch(captureError);
  }, [captureError]);

  return {
    handleSubmitIssue
  };
}
