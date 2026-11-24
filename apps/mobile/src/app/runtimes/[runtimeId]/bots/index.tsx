import { useLocalSearchParams } from "expo-router";
import { singleParam } from "@/navigation/routeParams";
import { parseBotManagementIntent } from "@/state/botSettings";
import { BotsScreen } from "@/components/screens/BotsScreen";

export default function BotsRoute() {
  const params = useLocalSearchParams<{ runtimeId: string; botId?: string; create?: string; workspaceId?: string }>();
  const intent = parseBotManagementIntent(singleParam(params.botId), singleParam(params.create), singleParam(params.workspaceId));
  return <BotsScreen runtimeId={singleParam(params.runtimeId)} intent={intent} />;
}
