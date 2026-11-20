import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { AboutLinkRow } from "@/components/app/dialogs/about/AboutLinkRow";
import { describeRepositoryStar, formatRepositoryStarLabel } from "@/components/app/logic/aboutDialogStatus";
import type { AboutLinksProps } from "@/components/app/types/aboutDialog.types";
import { Button } from "@/components/ui/button";
import { APP_COMPANY_NAME, APP_COMPANY_URL, APP_GITHUB_REPOSITORY_SLUG, APP_SHORT_NAME } from "@shared/appMeta";
import { Building2, ExternalLink, Github, ScrollText, Star } from "lucide-react";

export function AboutLinks({ repositoryStar, onShowThirdPartyNotices }: AboutLinksProps) {
  const isStarred = repositoryStar.status === "starred";

  return (
    <section className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-border/60 divide-y divide-border/60">
        <AboutLinkRow
          icon={Github}
          title="Source code"
          description={APP_GITHUB_REPOSITORY_SLUG}
          action={(
            <Button variant="ghost" size="sm" onClick={repositoryStar.openRepository} aria-label="Open repository on GitHub">
              Open
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </Button>
          )}
        />
        <AboutLinkRow
          icon={Star}
          title="Star on GitHub"
          description={describeRepositoryStar(repositoryStar.status, repositoryStar.starCount, APP_SHORT_NAME)}
          action={(
            <Button
              variant="outline"
              size="sm"
              onClick={repositoryStar.star}
              disabled={repositoryStar.status === "loading" || isStarred || repositoryStar.isStarring}
            >
              <Star
                className={isStarred ? "size-3.5 fill-amber-400/70 text-amber-400" : "size-3.5"}
                aria-hidden="true"
              />
              {formatRepositoryStarLabel(repositoryStar.status, repositoryStar.isStarring)}
            </Button>
          )}
        />
        <AboutLinkRow
          icon={ScrollText}
          title="Third-party notices"
          description="Open-source licenses bundled with the app"
          action={(
            <Button variant="ghost" size="sm" onClick={onShowThirdPartyNotices}>
              View
            </Button>
          )}
        />
        <AboutLinkRow
          icon={Building2}
          title={APP_COMPANY_NAME}
          description={`Created and owned by ${APP_COMPANY_NAME}`}
          action={(
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void noraSystemClient.openExternalUrl(APP_COMPANY_URL)}
              aria-label={`Open ${APP_COMPANY_NAME} website`}
            >
              Website
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </Button>
          )}
        />
      </div>
      {repositoryStar.error ? <div className="px-1 text-xs text-destructive">{repositoryStar.error}</div> : null}
    </section>
  );
}
