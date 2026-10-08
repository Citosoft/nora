import { formatAppCrashReport } from "@/components/app/logic/appCrashReport";
import type { AppCrashFallbackProps } from "@/components/app/types/appErrorBoundary.types";
import { Button } from "@/components/ui/button";
import { useState } from "react";

/**
 * Last-resort screen shown when the React tree fails to render. Deliberately depends on no app
 * context or state so it still works when those are what broke.
 */
export function AppCrashFallback({ crash, onReload }: AppCrashFallbackProps) {
  const [copied, setCopied] = useState(false);
  const report = formatAppCrashReport(crash);

  const handleCopy = (): void => {
    void navigator.clipboard.writeText(report).then(
      () => setCopied(true),
      () => setCopied(false)
    );
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Frameless window: keep a drag strip so the window can still be moved. */}
      <div className="app-drag h-10 shrink-0" />
      <main
        role="alert"
        className="mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col gap-4 px-6 pb-8"
      >
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            Nora hit an unexpected error while rendering. Your agents and terminals keep running in the
            background; reloading the window reconnects to them.
          </p>
        </div>
        <div className="flex gap-2">
          <Button autoFocus onClick={onReload}>
            Reload window
          </Button>
          <Button variant="outline" onClick={handleCopy}>
            {copied ? "Copied" : "Copy error details"}
          </Button>
        </div>
        <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words rounded-[5px] border bg-muted/40 p-3 font-mono text-xs text-muted-foreground">
          {report}
        </pre>
      </main>
    </div>
  );
}
