import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import { getFileEditorLeafName } from "@/components/app/logic/fileEditorPath";
import { Button } from "@/components/ui/button";
import type { FileEditorTab } from "@/components/app/types";
import { ExternalLink, FileText, LoaderCircle } from "lucide-react";
import { useState } from "react";

type ExternalFilePlaceholderProps = {
  tab: Pick<FileEditorTab, "projectId" | "path" | "rootPath">;
};

/** Shown for files Nora cannot render (e.g. PDFs); offers to open them in the OS default app instead. */
export function ExternalFilePlaceholder({ tab }: ExternalFilePlaceholderProps) {
  const [isOpening, setIsOpening] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileName = getFileEditorLeafName(tab.path);

  const openInDefaultApp = async () => {
    setIsOpening(true);
    setErrorMessage(null);
    try {
      await noraWorkspaceClient.openWorkspaceFileExternally({
        projectId: tab.projectId,
        path: tab.path,
        rootPath: tab.rootPath || undefined
      });
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to open this file in the default app.");
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-muted/20 p-6 text-center">
      <FileText className="size-10 text-muted-foreground" aria-hidden />
      <div className="space-y-1">
        <div className="text-sm font-medium text-foreground">{fileName}</div>
        <div className="text-sm text-muted-foreground">Nora can't preview this file type.</div>
      </div>
      <Button type="button" size="sm" onClick={() => void openInDefaultApp()} disabled={isOpening}>
        {isOpening ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : (
          <ExternalLink className="size-4" aria-hidden />
        )}
        Open in default app
      </Button>
      {errorMessage ? (
        <div role="alert" className="max-w-md text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}
