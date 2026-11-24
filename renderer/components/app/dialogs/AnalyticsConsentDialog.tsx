import type { AnalyticsConsentDialogProps } from "@/components/app/types/component.types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader
} from "@/components/ui/dialog";
import { BarChart3 } from "lucide-react";

export function AnalyticsConsentDialog({
  open,
  onAllow,
  onDecline
}: AnalyticsConsentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent headerTitle="Help improve Nora" className="max-w-[580px]">
        <DialogHeader>
          <DialogDescription>
            Can Nora collect optional usage analytics to help us improve reliability and product decisions?
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Nora counts app launches using a random installation ID, app version, operating system and country from your region setting,
            even if you decline optional analytics. This ID is separate from your account.
          </p>
          <div className="rounded-md border border-border/70 bg-background p-4">
            <div className="flex items-start gap-3">
              <BarChart3 className="mt-0.5 size-5 text-primary" />
              <div className="space-y-1 text-sm text-foreground">
                <div className="font-medium">You can change this anytime in Settings.</div>
                <div className="text-muted-foreground">
                  Open Settings → Privacy to change optional usage analytics.
                </div>
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onDecline}>
            No thanks
          </Button>
          <Button onClick={onAllow}>
            Allow analytics
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
