import { useSettingsRuntime } from "@/components/app/hooks/useSettingsRuntime";
import { useThreadPreferences } from "@/components/app/hooks/useThreadPreferences";
import { useMemoryReviewActivity } from "@/components/app/hooks/useMemoryReviewActivity";
import { SettingRow } from "@/components/app/panels/settings/settingsUi";
import { RuntimeTaskModelSetting } from "@/components/app/panels/settings/RuntimeTaskModelSetting";
import { TaskSourceOptionLabel } from "@/components/app/panels/settings/TaskSourceOptionLabel";
import { MemoryReviewActivityPanel } from "./MemoryReviewActivityPanel";
import { Select } from "@/components/ui/select";
import type { AiMemoryReviewProvider, AiMemoryReviewSettings } from "@shared/types/ai.types";

/** Local models are deliberately absent: a review's notes and transcript do not fit their context, and they cannot follow its rules. */
const SOURCES: readonly { value: AiMemoryReviewProvider; label: string }[] = [
  { value: "claude", label: "Claude runtime (existing sign-in)" },
  { value: "codex", label: "Codex runtime (existing sign-in)" },
  { value: "cloud", label: "Cloud API (BYOK)" }
];
const parseSource = (value: string): AiMemoryReviewProvider => SOURCES.find((source) => source.value === value)?.value ?? "claude";

/**
 * How Nora and bots keep notes automatically: whether background reviews run, which source and model they use (separate from
 * simple tasks, so a small simple-task model never writes the notes), and what they did and cost recently.
 */
export function MemorySettings() {
  const { appSettings, updateAiSimpleTaskSettings } = useSettingsRuntime();
  const { preferences, save, busy, error } = useThreadPreferences();
  const activity = useMemoryReviewActivity();
  const { ai } = appSettings;
  const saveReview = (memoryReview: AiMemoryReviewSettings): void => updateAiSimpleTaskSettings({ simpleTaskProvider: ai.simpleTaskProvider,
    localLlmModelId: ai.localLlmModelId, runtimeModelByProvider: ai.runtimeModelByProvider, memoryReview });
  const review = ai.memoryReview;
  return <section aria-labelledby="bots-memory" className="space-y-3">
    <div>
      <h2 id="bots-memory" className="text-sm font-medium">Memory</h2>
      <p className="text-sm text-muted-foreground">Nora and every bot keep notes that carry across threads. You can always see and edit them in each bot's info panel.</p>
    </div>
    <SettingRow title="Automatic memory" description="After a thread goes quiet, settles or reaches 10 turns, review it and save lasting preferences and facts as Nora's or the bot's notes. Notes you wrote are never changed."
      control={<Select aria-label="Automatic memory" value={String(preferences.automaticMemory)} disabled={busy}
        onChange={(event) => void save({ automaticMemory: event.target.value === "true" })}>
        <option value="true">Enabled</option><option value="false">Disabled</option>
      </Select>} />
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    <SettingRow title="Memory review source"
      description="Reviews read a thread and its notes in one request, so they need a capable model with a large context. On-device models are not offered."
      control={<Select aria-label="Memory review source" value={review.provider} onChange={(event) => saveReview({ ...review, provider: parseSource(event.target.value) })}>
        {SOURCES.map((source) => <option key={source.value} value={source.value}><TaskSourceOptionLabel source={source.value} label={source.label} /></option>)}
      </Select>} />
    {review.provider === "cloud"
      ? <SettingRow title="Memory review model" control={null} description="Uses the Cloud API provider, key and generation model in Settings → AI." />
      : <RuntimeTaskModelSetting title="Memory review model" description="A mid-sized model with a large context writes the most reliable notes."
        provider={review.provider} value={review.runtimeModel} onChange={(runtimeModel) => saveReview({ ...review, runtimeModel })} />}
    <MemoryReviewActivityPanel state={activity} />
  </section>;
}
