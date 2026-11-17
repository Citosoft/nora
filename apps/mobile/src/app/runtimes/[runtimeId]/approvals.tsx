import { useLocalSearchParams } from "expo-router";
import { ApprovalsScreen } from "@/components/screens/ApprovalsScreen";
import { singleParam } from "@/navigation/routeParams";

export default function ApprovalsRoute() {
  const { runtimeId } = useLocalSearchParams<{ runtimeId: string }>();
  return <ApprovalsScreen runtimeId={singleParam(runtimeId)} />;
}
