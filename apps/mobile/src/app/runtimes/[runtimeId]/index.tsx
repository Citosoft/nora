import { useLocalSearchParams } from "expo-router";
import { NewConversationScreen } from "@/components/screens/NewConversationScreen";
import { singleParam } from "@/navigation/routeParams";

export default function RuntimeHomeRoute() {
  const { runtimeId } = useLocalSearchParams<{ runtimeId: string }>();
  return <NewConversationScreen runtimeId={singleParam(runtimeId)} initialProjectId={null} />;
}
