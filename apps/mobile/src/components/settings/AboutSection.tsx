import { router } from "expo-router";
import { routes } from "@/navigation/routes";
import { useAppUpdateStatus } from "@/hooks/useAppUpdateStatus";
import { appVersionLabel } from "@/state/appAbout";
import { ListRow } from "@/components/common/ListRow";
import { ListSection } from "@/components/common/ListSection";

export function AboutSection() {
  const { info } = useAppUpdateStatus();
  return <ListSection header="About">
    <ListRow title="About Nora" subtitle={appVersionLabel(info)} accessory="chevron" onPress={() => router.push(routes.about)} />
  </ListSection>;
}
