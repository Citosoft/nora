import { useLocalSearchParams } from "expo-router";
import { InboxScreen } from "@/components/screens/InboxScreen";
import { singleParam } from "@/navigation/routeParams";

export default function InboxRoute() {
  const { runtimeId } = useLocalSearchParams<{ runtimeId: string }>();
  return <InboxScreen runtimeId={singleParam(runtimeId)} />;
}
