import type { ConnectorAccessChoiceIconProps } from "@/components/app/types/noraConnectors.types";
import { BotAvatar } from "./BotAvatar";
import { WorkspaceAvatar } from "./WorkspaceAvatar";

/** A workspace's avatar or a bot's face, at the small size used in pickers and summaries. */
export function ConnectorAccessChoiceIcon({ choice }: ConnectorAccessChoiceIconProps) {
  return choice.kind === "bot" ? <BotAvatar avatar={choice.avatar} size={20} className="shrink-0" /> : <WorkspaceAvatar workspace={choice.avatar} size="small" />;
}
