import { Linking } from "react-native";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useTheme } from "@/hooks/useTheme";
import { presentPushStatus } from "@/state/pushNotificationStatus";
import { layout } from "@/theme/tokens";
import { ListRow } from "@/components/common/ListRow";
import { ListSection } from "@/components/common/ListSection";

/** Native only: the web app and demo mode cannot receive notifications, so the section is hidden there. */
export function NotificationSettings() {
  const push = usePushNotifications();
  const { colors } = useTheme();
  if (!push.supported) return null;
  const presentation = presentPushStatus(push.enabled, push.status);
  return (
    <ListSection header="Notifications" footer={presentation.footer} separatorInset={layout.iconRowInset}>
      <ListRow title="Notifications" value={presentation.on ? "On" : "Off"} disabled={push.busy}
        icon={{ icon: "notifications", color: colors.tones.attention.solid }}
        accessibilityHint={presentation.on ? "Turns off notifications on this phone" : "Turns on notifications on this phone"}
        onPress={() => void push.setEnabled(!presentation.on)} />
      {presentation.openSettings ? (
        <ListRow title="Open Settings" accessory="chevron" icon={{ icon: "settings", color: colors.tones.active.solid }}
          onPress={() => void Linking.openSettings()} />
      ) : null}
    </ListSection>
  );
}
