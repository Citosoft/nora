import type { ForgeWorkItemKind, ForgeOverview, ForgeWorkItemDetail, ForgeWorkItemSummary } from "@shared/appTypes";

export interface ForgeItemsPorts {
  projectId: string | null;
  overview: ForgeOverview | null;
  loading: boolean;
  refresh(): void;
  readDetail(projectId: string, kind: ForgeWorkItemKind, item: ForgeWorkItemSummary): Promise<ForgeWorkItemDetail>;
  open(projectId: string, kind: ForgeWorkItemKind, item: ForgeWorkItemSummary): void;
  openIntegrations(): void;
}
