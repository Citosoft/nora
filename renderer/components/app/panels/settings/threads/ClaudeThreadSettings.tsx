import { useThreadPreferences } from "@/components/app/hooks/useThreadPreferences";
import { Select } from "@/components/ui/select";
import { SettingRow } from "../settingsUi";
import { IdleCompactionSetting } from "../IdleCompactionSetting";
import { ThreadModelDefaultSetting } from "../ThreadModelDefaultSetting";

const CLAUDE = ["claude"] as const;

/** Thread settings only Claude's runtime supports. */
export function ClaudeThreadSettings() {
  const { preferences, save, busy, error } = useThreadPreferences();
  return <>
    <ThreadModelDefaultSetting target="subagent" providerKinds={CLAUDE} />
    <SettingRow title="Suggested replies" description="After each turn in your own threads, suggest what you might send next. Each suggestion is an extra request over the thread's context, so turning this off saves tokens. Bot threads and chats never suggest replies."
      control={<Select aria-label="Suggested replies" value={String(preferences.promptSuggestions)} disabled={busy}
        onChange={(event) => void save({ promptSuggestions: event.target.value === "true" })}>
        <option value="true">Enabled</option><option value="false">Disabled</option>
      </Select>} />
    <SettingRow title="Compaction threshold" description="Ask Claude to compact near this context size, starting with its next turn. This does not enlarge the model's context window."
      control={<Select aria-label="Claude compaction threshold" value={preferences.claudeAutoCompactTokens ?? "default"} disabled={busy}
        onChange={(event) => void save({ claudeAutoCompactTokens: event.target.value === "default" ? null : Number(event.target.value) })}>
        <option value="default">Provider default</option>{[100_000, 200_000, 300_000, 500_000, 1_000_000].map((tokens) => <option key={tokens} value={tokens}>{tokens.toLocaleString()} tokens</option>)}
      </Select>} />
    <IdleCompactionSetting />
    {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
  </>;
}
