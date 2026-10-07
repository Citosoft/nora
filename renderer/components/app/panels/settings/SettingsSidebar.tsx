import { SETTINGS_GROUP_ITEMS } from "@/components/app/constants/settingsGroups";
import { SETTINGS_SEARCH_INDEX } from "@/components/app/constants/settingsSearchIndex";
import { searchSettings } from "@/components/app/logic/settingsSearch";
import type { SettingsGroup } from "@/components/app/types/settings.types";
import type { SettingsGroupItem, SettingsSearchEntry, SettingsSearchGroupResult } from "@/components/app/types/settingsSearch.types";
import { Input } from "@/components/ui/input";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { useMemo, useState, type KeyboardEvent } from "react";

const NAV_ITEM_CLASS_NAME = "flex w-full items-center justify-start gap-2 rounded-[3px] px-3 py-2 text-sm";

function GroupLabel({ item }: { item: SettingsGroupItem }) {
  const Icon = item.icon;
  return (
    <>
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {item.label}
    </>
  );
}

function SettingsSearchResults({
  results,
  activeGroup,
  onSelectGroup,
  onRevealSetting
}: {
  results: SettingsSearchGroupResult<SettingsGroupItem>[];
  activeGroup: SettingsGroup;
  onSelectGroup: (group: SettingsGroup) => void;
  onRevealSetting: (entry: SettingsSearchEntry) => void;
}) {
  if (results.length === 0) {
    return <div className="px-3 py-2 text-sm text-muted-foreground">No matching settings</div>;
  }

  return (
    <ul className="flex flex-col gap-1" aria-label="Matching settings">
      {results.map(({ group, entries }) => (
        <li key={group.value}>
          <button
            type="button"
            onClick={() => onSelectGroup(group.value)}
            aria-current={group.value === activeGroup ? "page" : undefined}
            className={`${NAV_ITEM_CLASS_NAME} font-medium text-muted-foreground transition hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:text-foreground`}
          >
            <GroupLabel item={group} />
          </button>
          {entries.length > 0 ? (
            <ul className="mt-0.5 flex flex-col">
              {entries.map((entry) => (
                <li key={entry.title}>
                  <button
                    type="button"
                    onClick={() => onRevealSetting(entry)}
                    className="w-full truncate rounded-[3px] py-1.5 pl-9 pr-3 text-left text-xs text-muted-foreground transition hover:bg-accent/60 hover:text-foreground"
                  >
                    {entry.title}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function SettingsSidebar({
  activeGroup,
  onSelectGroup,
  onRevealSetting
}: {
  activeGroup: SettingsGroup;
  onSelectGroup: (group: SettingsGroup) => void;
  onRevealSetting: (entry: SettingsSearchEntry) => void;
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchSettings(SETTINGS_GROUP_ITEMS, SETTINGS_SEARCH_INDEX, query), [query]);

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && query) {
      event.preventDefault();
      event.stopPropagation();
      setQuery("");
      return;
    }
    if (event.key === "Enter" && results && results.length > 0) {
      event.preventDefault();
      const [first] = results;
      const [firstEntry] = first.entries;
      if (firstEntry) {
        onRevealSetting(firstEntry);
      } else {
        onSelectGroup(first.group.value);
      }
    }
  };

  return (
    <div className="flex min-h-0 flex-col gap-3 overflow-y-auto border-r border-border/60 bg-card/40 px-4 py-5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search settings"
          aria-label="Search settings"
          className="h-9 pl-8"
        />
      </div>
      {results ? (
        <SettingsSearchResults
          results={results}
          activeGroup={activeGroup}
          onSelectGroup={onSelectGroup}
          onRevealSetting={onRevealSetting}
        />
      ) : (
        <TabsList className="flex w-full flex-col items-stretch gap-1 border-0 bg-transparent p-0">
          {SETTINGS_GROUP_ITEMS.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className={`${NAV_ITEM_CLASS_NAME} data-[state=active]:bg-accent data-[state=active]:text-foreground`}
            >
              <GroupLabel item={item} />
            </TabsTrigger>
          ))}
        </TabsList>
      )}
    </div>
  );
}
