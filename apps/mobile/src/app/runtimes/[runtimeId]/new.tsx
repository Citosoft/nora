import { useLocalSearchParams } from "expo-router";
import { NewConversationScreen } from "@/components/screens/NewConversationScreen";
import { singleParam } from "@/navigation/routeParams";

export default function NewConversationRoute() {
  const { runtimeId, projectId } = useLocalSearchParams<{ runtimeId: string; projectId?: string }>();
  return <NewConversationScreen runtimeId={singleParam(runtimeId)} initialProjectId={singleParam(projectId) || null} />;
}
