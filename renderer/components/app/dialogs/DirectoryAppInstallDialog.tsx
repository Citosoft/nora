import { useDirectoryAppInstall } from "@/components/app/hooks/useDirectoryAppInstall";
import { useNewAppDraft } from "@/components/app/hooks/useNewAppDraft";
import { useAppImport } from "@/components/app/hooks/useAppImport";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { ImportAppDialog } from "@/components/app/panels/apps/ImportAppDialog";
import { Button } from "@/components/ui/button";
import { AppInstallFrame } from "@/components/app/panels/apps/AppInstallFrame";
import { DialogBody, DialogFooter } from "@/components/ui/dialog";
import type { DirectoryAppReviewProps } from "@/components/app/types/directoryInstall.types";

/** Always mounted in the signed-in shell so website links work from any screen. */
export function DirectoryAppInstallDialog() {
  const install = useDirectoryAppInstall();
  if (!install.id) return null;
  if (install.file) return <DirectoryAppReview key={install.id} file={install.file} onDismiss={install.dismiss} />;
  return <AppInstallFrame open title={install.error ? "Couldn't load this app" : "Install app"} source="Nora app directory" onClose={install.dismiss}>
      <DialogBody className="px-5 py-4">
        {install.error
          ? <p role="alert" className="text-sm text-destructive">{install.error}</p>
          : <div role="status" aria-label="Downloading the app" className="space-y-2.5">{["w-3/4", "w-1/2"].map((width) => <div key={width} className={`h-3.5 animate-pulse rounded bg-muted ${width}`} />)}</div>}
      </DialogBody>
      <DialogFooter><Button variant="ghost" onClick={install.dismiss}>{install.error ? "Close" : "Cancel"}</Button></DialogFooter>
  </AppInstallFrame>;
}

function DirectoryAppReview({ file, onDismiss }: DirectoryAppReviewProps) {
  const draft = useNewAppDraft();
  const navigation = useWorkspaceNavigation();
  const native = useNativeRuntimePorts();
  const importer = useAppImport(draft, (activeAppId) => {
    onDismiss();
    navigation.closeTool();
    navigation.setPreferences((current) => ({ ...current, sidebarMode: "apps", activeAppId }));
    native.store.showHome();
  }, file);
  return <ImportAppDialog draft={draft} importer={{ ...importer, cancel: onDismiss }} />;
}
