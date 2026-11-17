import { useLocalSearchParams } from "expo-router";
import { ActivityScreen } from "@/components/screens/ActivityScreen";
import { singleParam } from "@/navigation/routeParams";

export default function ActivityRoute() {
  const { runtimeId } = useLocalSearchParams<{ runtimeId: string }>();
  return <ActivityScreen runtimeId={singleParam(runtimeId)} />;
}
