import { usePushNotifications } from "@/hooks/usePushNotifications";
import { shouldOfferPushPrompt } from "@/state/pushNotificationStatus";
import { Banner } from "@/components/common/Banner";
import { Button } from "@/components/common/Button";
import { Inset } from "@/components/common/Inset";

/** A one-time offer to turn on notifications; either answer hides it for good, and Settings keeps the switch. */
export function PushPrompt({ dismissed, linkedComputers, onDismiss }: { dismissed: boolean; linkedComputers: number; onDismiss: () => void }) {
  const push = usePushNotifications();
  if (!shouldOfferPushPrompt({ supported: push.supported, enabled: push.enabled, status: push.status, dismissed, linkedComputers })) return null;
  const turnOn = async (): Promise<void> => {
    await push.setEnabled(true);
    onDismiss();
  };
  return (
    <Inset>
      <Banner tone="active" title="Get notified when a thread finishes or needs you"
        message="Your phone tells you when an agent is done or waiting for an approval or answer. You can change this in Settings."
        action={(
          <>
            <Button label="Turn on" variant="primary" compact busy={push.busy} onPress={() => void turnOn()} />
            <Button label="Not now" compact disabled={push.busy} onPress={onDismiss} />
          </>
        )} />
    </Inset>
  );
}
