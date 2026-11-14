import type { WorkspaceToolProps } from "../workspaceNavigation.types";
import type { ForgeWorkItemKind, ForgeRepoSummary, ForgeWorkItemDetail, ForgeWorkItemSummary } from "@shared/appTypes";
import type { ForgeItemsPorts } from "./ports.types";
import type { ThreadReadState } from "../threadForge.types";

export type ItemFilter = "all" | "ready" | "draft";
export type ItemSort = "updated" | "newest" | "title";
export interface ItemListOptions {
  query: string;
  filter: ItemFilter;
  sort: ItemSort;
}
export interface ForgeItemsToolProps extends WorkspaceToolProps { kind: ForgeWorkItemKind; }

export interface ItemRowProps {
  kind: ForgeWorkItemKind;
  item: ForgeWorkItemSummary;
  projectId: string;
  repo: ForgeRepoSummary;
  expanded: boolean;
  readDetail: ForgeItemsPorts["readDetail"];
  onToggle(): void;
  onOpen(): void;
}

export interface ItemTableProps {
  kind: ForgeWorkItemKind;
  items: readonly ForgeWorkItemSummary[];
  projectId: string;
  repo: ForgeRepoSummary;
  readDetail: ForgeItemsPorts["readDetail"];
  onOpen(item: ForgeWorkItemSummary): void;
}

export interface ItemGroup {
  id: "open" | "draft";
  label: string;
  items: ForgeWorkItemSummary[];
}

export interface ItemDetailsProps {
  kind: ForgeWorkItemKind;
  item: ForgeWorkItemSummary;
  state: ThreadReadState<ForgeWorkItemDetail>;
  onRetry(): void;
  onOpen(): void;
}

export interface ItemDetailSnapshot {
  identity: string;
  state: ThreadReadState<ForgeWorkItemDetail>;
}

export interface ItemDetailInput {
  identity: string;
  enabled: boolean;
  read(): Promise<ForgeWorkItemDetail>;
}
