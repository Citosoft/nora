import type { SettingsGroup } from "@/components/app/types/settings.types";
import type { LucideIcon } from "lucide-react";

export interface SettingsGroupItem {
  value: SettingsGroup;
  label: string;
  icon: LucideIcon;
}

/** One searchable setting. `title` must match the rendered `SettingRow` title so search can reveal the row. */
export interface SettingsSearchEntry {
  group: SettingsGroup;
  title: string;
  keywords?: readonly string[];
}

export interface SettingsSearchGroupResult<TGroup extends Pick<SettingsGroupItem, "value" | "label">> {
  group: TGroup;
  entries: SettingsSearchEntry[];
}

export interface SettingRowRevealTarget {
  group: SettingsGroup;
  title: string;
  /** Increments per request so revealing the same row twice re-triggers the scroll. */
  requestId: number;
}
