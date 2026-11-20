import { MarkdownRenderer } from "@/components/app/shared/MarkdownRenderer";
import type { ThirdPartyNoticesDialogProps } from "@/components/app/types/aboutDialog.types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";

export function ThirdPartyNoticesDialog({ notices }: ThirdPartyNoticesDialogProps) {
  const close = (): void => notices.setOpen(false);

  return (
    <Dialog open={notices.open} onOpenChange={notices.setOpen}>
      <DialogContent onClose={close} headerTitle="Third-party notices" className="max-w-[900px]">
        <DialogBody className="min-h-[420px]">
          {notices.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading notices…</div>
          ) : notices.error ? (
            <div className="text-sm text-destructive">{notices.error}</div>
          ) : (
            <MarkdownRenderer className="max-w-none">
              {notices.content || "No third-party notices were found."}
            </MarkdownRenderer>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
