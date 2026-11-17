import { useLocalSearchParams } from "expo-router";
import { ChatScreen } from "@/components/screens/ChatScreen";
import { singleParam } from "@/navigation/routeParams";

export default function ChatRoute() {
  const { runtimeId, conversationId } = useLocalSearchParams<{ runtimeId: string; conversationId: string }>();
  return <ChatScreen runtimeId={singleParam(runtimeId)} conversationId={singleParam(conversationId)} />;
}
