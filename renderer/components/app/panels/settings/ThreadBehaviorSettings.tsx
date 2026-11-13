import { useThreadPreferences } from "@/components/app/hooks/useThreadPreferences";
import { Select } from "@/components/ui/select";
import { SettingRow } from "./settingsUi";
import { threadPreferencesSchema } from "@shared/personalization/contracts";

export function ThreadBehaviorSettings() {
  const { preferences, save, busy, error } = useThreadPreferences();
  return <>
    <SettingRow title="Tool output budget" description="Starting next turn, keep supported Claude text results compact with full output saved for targeted reads. Codex uses a native 2,000-token ceiling, preserving stricter configured limits. Structured results and other providers retain native handling."
      control={<Select aria-label="Tool output budget" value={preferences.toolOutputBudget} disabled={busy}
        onChange={(event) => void save({ toolOutputBudget: threadPreferencesSchema.shape.toolOutputBudget.parse(event.target.value) })}>
        <option value="compact">Compact output</option><option value="provider-default">Provider defaults</option>
      </Select>} />
    <SettingRow title="Follow-up behavior" description="Queue messages while an agent works, or steer its active turn when supported. Messages queue when steering is unavailable."
      control={<Select aria-label="Follow-up behavior" value={preferences.followUp} disabled={busy}
        onChange={(event) => void save({ followUp: threadPreferencesSchema.shape.followUp.parse(event.target.value) })}>
        <option value="queue">Queue messages</option><option value="steer">Steer the active turn</option>
      </Select>} />
    <SettingRow title="Automatic thread titles" description="Generate a short title after the first message. Turn off to keep the prompt-based title; existing titles are preserved."
      control={<Select aria-label="Automatic thread titles" value={String(preferences.automaticTitles)} disabled={busy}
        onChange={(event) => void save({ automaticTitles: event.target.value === "true" })}>
        <option value="true">Enabled</option><option value="false">Disabled</option>
      </Select>} />
    <SettingRow title="Idle thread settlement" description="Move completed, inactive threads to Settled after this time. Active work, queued messages and approvals are excluded. History and drafts are retained; threads can be reopened. Nora must be running."
      control={<Select aria-label="Idle thread settlement" value={preferences.settleAfterDays ?? "never"} disabled={busy}
        onChange={(event) => void save({ settleAfterDays: event.target.value === "never" ? null : Number(event.target.value) })}>
        <option value="never">Never</option>{[1, 7, 14, 30, 90].map((days) => <option key={days} value={days}>After {days} {days === 1 ? "day" : "days"}</option>)}
      </Select>} />
    <SettingRow title="Claude compaction threshold" description="Ask Claude to compact near this context size, starting with its next turn. This does not enlarge the model's context window. Other providers keep their native compaction policy."
      control={<Select aria-label="Claude compaction threshold" value={preferences.claudeAutoCompactTokens ?? "default"} disabled={busy}
        onChange={(event) => void save({ claudeAutoCompactTokens: event.target.value === "default" ? null : Number(event.target.value) })}>
        <option value="default">Provider default</option>{[100_000, 200_000, 300_000, 500_000, 1_000_000].map((tokens) => <option key={tokens} value={tokens}>{tokens.toLocaleString()} tokens</option>)}
      </Select>} />
    {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
  </>;
}
