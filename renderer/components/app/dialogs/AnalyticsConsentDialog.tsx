import { ANALYTICS_DISCLOSURE } from "@/components/app/constants/analyticsDisclosure";
import { AnalyticsDisclosure } from "@/components/app/shared/AnalyticsDisclosure";
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

export function AnalyticsConsentDialog({
  open,
  usageStatisticsRequireConsent,
  onAllow,
  onDecline
}: AnalyticsConsentDialogProps) {
  // Where the law needs opt-in for any analytics, nothing has been sent yet and one answer covers both levels.
  const sections = usageStatisticsRequireConsent
    ? [
      { title: "Usage statistics", items: ANALYTICS_DISCLOSURE.statistics },
      { title: "Detailed analytics", items: ANALYTICS_DISCLOSURE.detailed }
    ]
    : [
      { title: "Sent now, unless you turn it off in Settings → Privacy", items: ANALYTICS_DISCLOSURE.statistics },
      { title: "Sent only if you allow detailed analytics", items: ANALYTICS_DISCLOSURE.detailed }
    ];
  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent headerTitle="Help improve Nora" className="max-w-[620px]">
        <DialogHeader>
          <DialogDescription>
            {usageStatisticsRequireConsent
              ? "Can Nora send usage analytics to help us fix problems and decide what to build? Nothing is sent unless you allow it."
              : "Nora sends anonymous usage statistics to help us fix problems and decide what to build. Would you also like to share detailed analytics?"}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <AnalyticsDisclosure sections={sections} />
          <p className="text-sm text-muted-foreground">You can change either choice at any time in Settings → Privacy.</p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onDecline}>
            No thanks
          </Button>
          <Button onClick={onAllow}>
            {usageStatisticsRequireConsent ? "Allow analytics" : "Allow detailed analytics"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
