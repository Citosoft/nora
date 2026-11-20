import type { PickedAppFile } from "@shared/types/apps/portable.types";

export interface DirectoryAppReviewProps { file: PickedAppFile; onDismiss(): void; }

export interface DirectoryAppDownload { id: string; picked: PickedAppFile; }
