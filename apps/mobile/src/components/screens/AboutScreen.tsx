import { Screen } from "@/components/common/Screen";
import { Button } from "@/components/common/Button";
import { Inset } from "@/components/common/Inset";
import { ListSection } from "@/components/common/ListSection";
import { AboutInfoRow } from "@/components/settings/AboutInfoRow";
import { useAppUpdateStatus } from "@/hooks/useAppUpdateStatus";
import { appAboutSections } from "@/state/appAbout";
import { reloadApp } from "@/platform/reloadApp";
import { routes } from "@/navigation/routes";

export function AboutScreen() {
  const { info, check } = useAppUpdateStatus();
  const sections = appAboutSections(info);
  return <Screen title="About Nora" back={{ label: "Settings", fallbackHref: routes.settings }}>
    {sections.map((section) => <ListSection key={section.title} header={section.title} footer={section.footer}>
      {section.rows.map((row) => <AboutInfoRow key={row.label} row={row} />)}
    </ListSection>)}
    {info.kind === "native" && info.updatesEnabled ? <Inset>
      <Button label={info.checking ? "Checking…" : info.pending ? "Show downloaded update" : "Check for updates"}
        variant="primary" busy={info.checking} onPress={check} />
    </Inset> : null}
    {info.kind === "web" && reloadApp ? <Inset><Button label="Refresh app" onPress={reloadApp} /></Inset> : null}
  </Screen>;
}
