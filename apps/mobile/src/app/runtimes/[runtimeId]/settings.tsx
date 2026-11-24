import { useLocalSearchParams } from "expo-router";
import { singleParam } from "@/navigation/routeParams";
import { ComputerSettingsScreen } from "@/components/screens/ComputerSettingsScreen";

export default function ComputerSettingsRoute() {
  const { runtimeId } = useLocalSearchParams<{ runtimeId: string }>();
  return <ComputerSettingsScreen runtimeId={singleParam(runtimeId)} />;
}
