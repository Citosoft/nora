import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type {
  AutoUpdateTestTarget,
  LatestReleaseAssetsResult,
  ReleaseAssetDownloadProgressPayload,
  ReleaseAssetDownloadResult,
  ReleaseAssetSummary,
  ReleaseVersionStatus
} from "@shared/appTypes";

export type RepositoryStarStatus = "loading" | "starred" | "unstarred" | "unavailable";

export type AboutUpdateTone = "pending" | "current" | "available" | "error";

/** Presentation-ready view of the release check shown in the About dialog. */
export type AboutUpdateSummary = {
  tone: AboutUpdateTone;
  label: string;
  installedVersion: string;
  latestVersion: string | null;
  /** Extra context worth showing (for example the error message); never repeats the latest version. */
  detail: string | null;
  canUpdate: boolean;
};

export type AutoUpdateTestAction = {
  target: AutoUpdateTestTarget;
  label: string;
};

export type AboutUpdateStatusState = {
  status: ReleaseVersionStatus | null;
  hasChecked: boolean;
  autoUpdateTestingEnabled: boolean;
};

export type RepositoryStarState = {
  status: RepositoryStarStatus;
  starCount: number | null;
  isStarring: boolean;
  error: string | null;
  star: () => void;
  openRepository: () => void;
};

export type ThirdPartyNoticesState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  show: () => void;
  content: string;
  isLoading: boolean;
  error: string | null;
};

export type ReleaseAssetDownloadState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  show: () => void;
  isLoading: boolean;
  result: LatestReleaseAssetsResult | null;
  selectedDownloadUrl: string;
  setSelectedDownloadUrl: (downloadUrl: string) => void;
  selectedAsset: ReleaseAssetSummary | null;
  isDownloading: boolean;
  downloadResult: ReleaseAssetDownloadResult | null;
  progress: ReleaseAssetDownloadProgressPayload | null;
  download: () => void;
};

export type AboutHeroProps = {
  summary: AboutUpdateSummary;
};

export type UpdateStatusBadgeProps = {
  summary: AboutUpdateSummary;
};

export type AboutUpdateBannerProps = {
  summary: AboutUpdateSummary;
  onDownload: () => void;
  onSelfUpdate: () => void;
  isStartingSelfUpdate: boolean;
  selfUpdateError: string | null;
};

export type AboutLinkRowProps = {
  icon: LucideIcon;
  title: ReactNode;
  description: ReactNode;
  action: ReactNode;
};

export type AboutLinksProps = {
  repositoryStar: RepositoryStarState;
  onShowThirdPartyNotices: () => void;
};

export type ThirdPartyNoticesDialogProps = {
  notices: ThirdPartyNoticesState;
};

export type ReleaseAssetDialogProps = {
  releaseAssets: ReleaseAssetDownloadState;
};
