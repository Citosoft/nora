import type { AppIcon } from "@shared/types/apps/apps.types";

export interface AppStarterMetric {
  label: string;
  value: string;
  note: string;
}

export interface AppStarterPreview {
  prompt: string;
  /** The kinds of connected service the example reads from, named generically rather than by provider. */
  sources: readonly string[];
  metrics: readonly AppStarterMetric[];
  chartTitle: string;
  bars: readonly number[];
  listTitle: string;
  rows: readonly { title: string; detail: string; value: string }[];
}

export interface AppStarter {
  id: string;
  label: string;
  icon: AppIcon;
  description: string;
  text: string;
  preview: AppStarterPreview;
}

export interface AppsWelcomeProps {
  onCreate(description?: string): void;
  onImport(): void;
  importing: boolean;
}

export interface AppWelcomeShowcaseProps {
  onCreate(description: string): void;
}

export interface AppWelcomePreviewProps {
  example: AppStarter;
}
