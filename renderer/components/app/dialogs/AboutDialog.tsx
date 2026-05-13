import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { AppMark } from "@/components/app/shared/AppMark";
import { MarkdownRenderer } from "@/components/app/shared/MarkdownRenderer";
import type { AboutDialogProps } from "@/components/app/types/component.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import {
  APP_DESCRIPTION,
  APP_DOCS_URL,
  APP_NAME,
  APP_REPOSITORY_URL,
  APP_SHORT_NAME,
  APP_SUBMIT_ISSUE_URL,
  APP_VERSION
} from "@shared/appMeta";
import type { AutoUpdateTestTarget, ReleaseVersionStatus } from "@shared/appTypes";
import { cn } from "@/lib/utils";
import { ChevronDown, ExternalLink, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

const LOCAL_UPDATE_TESTING_PANEL_ID = "about-local-update-testing-panel";

const AUTO_UPDATE_TEST_ACTIONS: Array<{ target: AutoUpdateTestTarget; label: string }> = [
  { target: "checking", label: "Checking" },
  { target: "downloading", label: "Downloading" },
  { target: "downloaded", label: "Ready to install" },
  { target: "up-to-date", label: "Installed" },
  { target: "error", label: "Error" },
  { target: "idle", label: "Reset" }
];

type UpdateBadgeVariant = "success" | "warning" | "destructive" | "secondary";

const buildUpdatePresentation = (
  status: ReleaseVersionStatus | null,
  hasAttempted: boolean
): { statusLabel: string; badgeVariant: UpdateBadgeVariant; details: string[] } => {
  if (!hasAttempted || status === null) {
    return {
      statusLabel: "Checking for updates",
      badgeVariant: "secondary",
      details: []
    };
  }

  switch (status.kind) {
    case "available":
      return {
        statusLabel: "Update available",
        badgeVariant: "warning",
        details: [`Latest release ${status.latestVersion} · this install ${status.currentVersion}`]
      };
    case "up-to-date":
      return {
        statusLabel: "Up to date",
        badgeVariant: "success",
        details: [`Latest release ${status.latestVersion}`]
      };
    case "error":
      return {
        statusLabel: "Unable to check for updates",
        badgeVariant: "destructive",
        details: status.message ? [status.message] : []
      };
  }
};

const aboutSectionHeadingId = (title: string): string =>
  `about-section-${title.replace(/\s+/g, "-").toLowerCase()}`;

const AboutDialogSection = ({ title, children }: { title: string; children: ReactNode }) => {
  const headingId = aboutSectionHeadingId(title);
  return (
    <section aria-labelledby={headingId} className="space-y-2">
      <h3 id={headingId} className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="rounded-md border border-border/80 bg-muted/15 px-4 py-3">{children}</div>
    </section>
  );
};

const ExternalTextLink = ({
  href,
  ariaLabel,
  children
}: {
  href: string;
  ariaLabel: string;
  children: ReactNode;
}): ReactNode => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    aria-label={ariaLabel}
    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground"
  >
    <span>{children}</span>
    <ExternalLink className="size-3.5 shrink-0 opacity-70" aria-hidden />
  </a>
);

export function AboutDialog({
  open,
  onOpenChange
}: AboutDialogProps) {
  const [isThirdPartyNoticesOpen, setIsThirdPartyNoticesOpen] = useState(false);
  const [thirdPartyNoticesContent, setThirdPartyNoticesContent] = useState<string>("");
  const [isLoadingThirdPartyNotices, setIsLoadingThirdPartyNotices] = useState(false);
  const [thirdPartyNoticesError, setThirdPartyNoticesError] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<ReleaseVersionStatus | null>(null);
  const [hasAttemptedUpdateCheck, setHasAttemptedUpdateCheck] = useState(false);
  const [autoUpdateTestingEnabled, setAutoUpdateTestingEnabled] = useState(false);
  const [runningAutoUpdateTestTarget, setRunningAutoUpdateTestTarget] = useState<AutoUpdateTestTarget | null>(null);
  const [isLocalUpdateTestingExpanded, setIsLocalUpdateTestingExpanded] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsLocalUpdateTestingExpanded(false);
      return;
    }

    let mounted = true;
    setHasAttemptedUpdateCheck(false);
    setUpdateStatus(null);
    setRunningAutoUpdateTestTarget(null);

    noraSystemClient.getReleaseVersionStatus().then((status) => {
      if (!mounted) {
        return;
      }

      setUpdateStatus(status);
      setHasAttemptedUpdateCheck(true);
    }).catch((error: unknown) => {
      if (!mounted) {
        return;
      }

      setUpdateStatus({
        kind: "error",
        currentVersion: APP_VERSION,
        message: error instanceof Error ? error.message : "Unable to check for updates.",
        releaseUrl: ""
      });
      setHasAttemptedUpdateCheck(true);
    });

    noraSystemClient.getAutoUpdateTestSupport().then((support) => {
      if (!mounted) {
        return;
      }

      setAutoUpdateTestingEnabled(support.enabled);
    }).catch(() => {
      if (!mounted) {
        return;
      }

      setAutoUpdateTestingEnabled(false);
    });

    return () => {
      mounted = false;
    };
  }, [open]);

  const installedVersion = updateStatus?.currentVersion || APP_VERSION;
  const updatePresentation = buildUpdatePresentation(updateStatus, hasAttemptedUpdateCheck);

  const runAutoUpdateSimulation = (target: AutoUpdateTestTarget): void => {
    setRunningAutoUpdateTestTarget(target);
    void noraSystemClient.simulateAutoUpdateStatus(target)
      .catch(() => undefined)
      .finally(() => {
        setRunningAutoUpdateTestTarget((current) => (current === target ? null : current));
      });
  };

  const handleLocalUpdateTestingPanelToggle = (): void => {
    setIsLocalUpdateTestingExpanded((current) => !current);
  };

  const openThirdPartyNotices = (): void => {
    setIsThirdPartyNoticesOpen(true);
    if (thirdPartyNoticesContent || isLoadingThirdPartyNotices) {
      return;
    }
    setIsLoadingThirdPartyNotices(true);
    setThirdPartyNoticesError(null);
    void fetch("./THIRD_PARTY_NOTICES.md").then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load notices (HTTP ${response.status})`);
      }
      const content = await response.text();
      setThirdPartyNoticesContent(content);
    }).catch((error: unknown) => {
      setThirdPartyNoticesError(error instanceof Error ? error.message : "Failed to load third-party notices.");
    }).finally(() => {
      setIsLoadingThirdPartyNotices(false);
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          onClose={() => onOpenChange(false)}
          headerTitle={`About ${APP_SHORT_NAME}`}
          className="max-w-[500px]"
        >
          <DialogBody className="flex flex-col gap-6 pt-6 text-left">
            <div className="flex gap-4">
              <div className="flex shrink-0 items-start pt-0.5">
                <AppMark className="size-14 text-primary" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold leading-tight tracking-tight text-foreground">{APP_NAME}</h2>
                  <Badge variant="outline" className="font-mono text-[11px] font-normal tabular-nums">
                    v{installedVersion}
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{APP_DESCRIPTION}</p>
                <nav aria-label="Nora links" className="flex flex-wrap gap-x-5 gap-y-2">
                  <ExternalTextLink href={APP_DOCS_URL} ariaLabel="Documentation (opens in a new tab)">
                    Documentation
                  </ExternalTextLink>
                  <ExternalTextLink href={APP_REPOSITORY_URL} ariaLabel="Source code repository (opens in a new tab)">
                    Source
                  </ExternalTextLink>
                  <ExternalTextLink href={APP_SUBMIT_ISSUE_URL} ariaLabel="Report an issue (opens in a new tab)">
                    Report an issue
                  </ExternalTextLink>
                </nav>
              </div>
            </div>

            <div className="space-y-5">
              <AboutDialogSection title="Software updates">
                <div className="flex flex-wrap items-center gap-2 gap-y-2">
                  {!hasAttemptedUpdateCheck ? (
                    <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
                  ) : null}
                  <Badge variant={updatePresentation.badgeVariant}>{updatePresentation.statusLabel}</Badge>
                </div>
                {updatePresentation.details.length > 0 ? (
                  <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                    {updatePresentation.details.map((line, index) => (
                      <li key={index} className="leading-snug">
                        {line}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </AboutDialogSection>

              <AboutDialogSection title="Legal">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Copyright (c) Citosoft. All rights reserved. Created and owned by{" "}
                  <a
                    href="https://www.citosoft.co.uk"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Citosoft (opens in a new tab)"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Citosoft
                  </a>
                  .
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={openThirdPartyNotices}>
                    Third-party notices
                  </Button>
                </div>
              </AboutDialogSection>

              {autoUpdateTestingEnabled ? (
                <div className="overflow-hidden rounded-md border border-dashed border-border/70 bg-muted/10">
                  <button
                    type="button"
                    aria-expanded={isLocalUpdateTestingExpanded}
                    aria-controls={LOCAL_UPDATE_TESTING_PANEL_ID}
                    onClick={handleLocalUpdateTestingPanelToggle}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div
                        id="about-local-update-testing-heading"
                        className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        Local update testing
                      </div>
                      <p className="text-xs leading-snug text-muted-foreground">
                        Dev only — expand to simulate updater toasts and install flow.
                      </p>
                    </div>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                        isLocalUpdateTestingExpanded && "rotate-180"
                      )}
                      aria-hidden
                    />
                  </button>
                  {isLocalUpdateTestingExpanded ? (
                    <div
                      id={LOCAL_UPDATE_TESTING_PANEL_ID}
                      role="region"
                      aria-labelledby="about-local-update-testing-heading"
                      className="border-t border-border/60 px-4 py-3"
                    >
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Simulate updater states locally to verify the toast and install flow without publishing a release.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {AUTO_UPDATE_TEST_ACTIONS.map((action) => (
                          <Button
                            key={action.target}
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={runningAutoUpdateTestTarget !== null}
                            onClick={() => runAutoUpdateSimulation(action.target)}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isThirdPartyNoticesOpen} onOpenChange={setIsThirdPartyNoticesOpen}>
        <DialogContent
          onClose={() => setIsThirdPartyNoticesOpen(false)}
          headerTitle="Third-party notices"
          className="max-w-[900px]"
        >
          <DialogHeader>
            <DialogDescription>
              Open-source licenses and attributions for bundled dependencies.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="min-h-[420px]">
            {isLoadingThirdPartyNotices ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="size-6 animate-spin opacity-70" aria-hidden />
                <span>Loading notices…</span>
              </div>
            ) : thirdPartyNoticesError ? (
              <div className="text-sm text-destructive" role="alert">
                {thirdPartyNoticesError}
              </div>
            ) : (
              <MarkdownRenderer className="max-w-none">
                {thirdPartyNoticesContent || "No third-party notices were found."}
              </MarkdownRenderer>
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsThirdPartyNoticesOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
