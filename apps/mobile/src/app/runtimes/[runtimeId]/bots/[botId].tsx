import { useLocalSearchParams } from "expo-router";
import { BotChatScreen } from "@/components/screens/BotChatScreen";
import { singleParam } from "@/navigation/routeParams";

export default function BotChatRoute() {
  const { runtimeId, botId, workspaceId } = useLocalSearchParams<{ runtimeId: string; botId: string; workspaceId?: string }>();
  return <BotChatScreen runtimeId={singleParam(runtimeId)} botId={singleParam(botId)} workspaceId={singleParam(workspaceId) || null} />;
}
