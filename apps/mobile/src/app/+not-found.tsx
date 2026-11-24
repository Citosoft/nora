import { router } from "expo-router";
import { Button } from "@/components/common/Button";
import { Inset } from "@/components/common/Inset";
import { Screen } from "@/components/common/Screen";
import { StateView } from "@/components/common/StateView";
import { routes } from "@/navigation/routes";

export default function NotFoundRoute() {
  return (
    <Screen title="Not found" back={{ label: "Home", fallbackHref: routes.home }}>
      <StateView kind="empty" icon="compass-outline" title="This page doesn't exist" />
      <Inset><Button label="Go home" variant="ghost" onPress={() => router.replace(routes.home)} /></Inset>
    </Screen>
  );
}
