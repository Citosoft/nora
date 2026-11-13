import { MessagesSquare } from "lucide-react";
import { SettingsSectionHeader } from "./settingsUi";
import { IdleCompactionSetting } from "./IdleCompactionSetting";
import { ThreadModelDefaultSetting } from "./ThreadModelDefaultSetting";
import { ThreadBehaviorSettings } from "./ThreadBehaviorSettings";

export function ThreadsSettingsSection() {
  return <div className="max-w-4xl">
    <SettingsSectionHeader title="Threads" icon={MessagesSquare} description="Manage conversation context and how threads continue over time." />
    <ThreadModelDefaultSetting />
    <ThreadModelDefaultSetting target="subagent" />
    <ThreadBehaviorSettings />
    <IdleCompactionSetting />
  </div>;
}
