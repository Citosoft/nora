import { APP_DIRECTORY_URL } from "@shared/apps/installLink";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { useState } from "react";
import { ArrowLeft, ExternalLink, FileUp } from "lucide-react";
import { BOTS_HOME_COLUMN_CLASS, BOTS_HOME_SCROLL_CLASS } from "@/components/app/constants/botsHomeLayout";
import { APPS_SECTION_ICON } from "@/components/app/constants/appsSectionIcon";
import { useAppImport } from "@/components/app/hooks/useAppImport";
import { cn } from "@/lib/utils";
import type { AppsHomeProps } from "@/components/app/types/appsView.types";
import { Button } from "@/components/ui/button";
import { AppStarterGrid } from "./AppStarterGrid";
import { AppsHomeGrid } from "./AppsHomeGrid";
import { ImportAppDialog } from "./ImportAppDialog";
import { NewAppComposer } from "./NewAppComposer";
import { AppsWelcome } from "./AppsWelcome";

/** The Apps landing page: describe a new app, import one from a file, or open one you already have. */
export function AppsHome({ apps, error, onOpen, draft }: AppsHomeProps) {
  const importer = useAppImport(draft, onOpen);
  const [creating, setCreating] = useState(false);
  const welcome = !apps.length && !creating;
  const create = (description?: string): void => {
    if (description !== undefined) draft.setText(description);
    setCreating(true);
  };
  return <section aria-label="Apps home" className={cn(BOTS_HOME_SCROLL_CLASS, "overflow-y-auto")}>
    <div className={cn(BOTS_HOME_COLUMN_CLASS, welcome ? "min-h-full justify-center gap-4 pb-5" : "gap-10 pb-10 pt-12 sm:pb-14 sm:pt-16")}>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {importer.error && !importer.picked && <p role="alert" className="text-sm text-destructive">{importer.error}</p>}
      {welcome ? <AppsWelcome onCreate={create} onImport={importer.start} importing={importer.busy} /> : <>
        <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="min-w-0 max-w-xl">
            {!apps.length && <Button type="button" variant="ghost" size="sm" className="-ml-2 mb-5 text-muted-foreground" onClick={() => setCreating(false)}><ArrowLeft className="size-3.5" aria-hidden="true" />Back to Apps</Button>}
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="flex size-5 items-center justify-center rounded-md bg-primary/10 text-primary"><APPS_SECTION_ICON className="size-3" aria-hidden="true" /></span>Apps
            </div>
            <h1 className="text-balance text-3xl font-semibold tracking-tight">{apps.length ? "Build an app from your connectors" : "What would you like to build?"}</h1>
            <p className="mt-2 text-pretty text-sm leading-6 text-muted-foreground">Describe a dashboard or a small tool and Nora builds it over your connected services: live tables, charts, numbers and buttons that act. Refine it by chatting, and it stays here.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => { void noraSystemClient.openExternalUrl(APP_DIRECTORY_URL); }}>Browse shared apps<ExternalLink className="size-3.5" aria-hidden="true" /></Button>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={importer.start} disabled={importer.busy}><FileUp className="size-3.5" aria-hidden="true" />Import from file</Button>
          </div>
        </header>
        <div className="flex flex-col gap-6">
          <NewAppComposer draft={draft} autoFocus={!apps.length} />
          <AppStarterGrid onPick={draft.setText} />
        </div>
        {apps.length > 0 && <AppsHomeGrid apps={apps} onOpen={onOpen} />}
      </>}
    </div>
    <ImportAppDialog draft={draft} importer={importer} />
  </section>;
}
