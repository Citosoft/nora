import type { IconTileSpec } from "@/types/listUi.types";
import { layout } from "@/theme/tokens";
import type { StatusTone } from "@/types/conversationState.types";
import { useTheme } from "@/hooks/useTheme";
import { ListRow } from "@/components/common/ListRow";
import { ListSection } from "@/components/common/ListSection";
import { NORA_RELAY_NAME } from "@shared/remote-access/constants";

const statements: readonly { icon: IconTileSpec["icon"]; tone: StatusTone; text: string }[] = [
  { icon: "lock-closed", tone: "success", text: "Your conversations, files and agent work stay on your own computer. Nora doesn't store them." },
  { icon: "cloud", tone: "active", text: "This app talks to your computer through Cloudflare's network over an encrypted connection. It is not end-to-end encrypted: Cloudflare carries the traffic." },
  { icon: "power", tone: "attention", text: "Your computer must be on, awake and online with Nora running. If it sleeps or shuts down, agents stop and this app shows it as offline." },
  { icon: "shield-checkmark", tone: "success", text: "Only devices signed in to your Nora account can connect, and actions that need approval still ask you first." },
  { icon: "phone-portrait", tone: "neutral", text: "On this device, Nora keeps only your preferences, your computers' names and addresses, and messages that haven't been delivered yet. Sign-in is handled by Clerk." }
];

/** Plain statements of how remote access works; kept factual (no end-to-end encryption claims). */
export function PrivacyNotice() {
  const { colors } = useTheme();
  return (
    <ListSection header="Privacy and security" separatorInset={layout.iconRowInset}
      footer={`To stop ${NORA_RELAY_NAME}, turn it off in Nora Desktop → Settings → ${NORA_RELAY_NAME}, or remove the computer here. If you think someone else is signed in to your account, sign out of other sessions from your account settings in Nora Desktop.`}>
      {statements.map((statement) => (
        <ListRow key={statement.icon} title={statement.text} titleLines={0} icon={{ icon: statement.icon, color: colors.tones[statement.tone].solid }} />
      ))}
    </ListSection>
  );
}
