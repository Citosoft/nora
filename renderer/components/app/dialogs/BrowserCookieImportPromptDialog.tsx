import type { BrowserCookieImportPromptDialogProps } from "@/components/app/types/component.types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";

export function BrowserCookieImportPromptDialog({
  open,
  profiles,
  selectedProfileId,
  isLoadingProfiles,
  isImporting,
  onOpenChange,
  onSelectedProfileIdChange,
  onReloadProfiles,
  onImport,
  onSkip
}: BrowserCookieImportPromptDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        headerTitle="Import Chrome cookies?"
        className="max-w-[560px]"
      >
        <DialogHeader>
          <DialogDescription>
            Import cookies from a local Chrome profile so the internal browser can start signed in.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <Select
            value={selectedProfileId ?? ""}
            onChange={(event) => onSelectedProfileIdChange(event.target.value || null)}
            disabled={isLoadingProfiles || profiles.length === 0 || isImporting}
          >
            <option value="">Select profile</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.label} ({profile.totalCookies} cookies)
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onReloadProfiles} disabled={isLoadingProfiles || isImporting}>
              Refresh Profiles
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!selectedProfileId) {
                  return;
                }
                onImport(selectedProfileId);
              }}
              disabled={!selectedProfileId || isImporting}
            >
              {isImporting ? "Importing..." : "Import Now"}
            </Button>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onSkip} disabled={isImporting}>
            Not now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
