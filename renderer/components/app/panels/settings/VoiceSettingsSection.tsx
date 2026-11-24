import { useLocalVoiceSetup } from "@/components/app/hooks/useLocalVoiceSetup";
import { useSettingsRuntime } from "@/components/app/hooks/useSettingsRuntime";
import { summarizeLocalVoiceSetup } from "@/components/app/logic/localVoiceSetupSummary";
import { LocalVoiceModelOptionLabel } from "@/components/app/panels/settings/LocalVoiceModelOptionLabel";
import { SettingRow, SettingsSectionHeader } from "@/components/app/panels/settings/settingsUi";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { VoiceSettings } from "@shared/appTypes";
import { isLocalVoiceModelId, LOCAL_VOICE_MODELS, localVoiceModel } from "@shared/voice/localModels";
import { Download, Mic2, RefreshCcw } from "lucide-react";

function LocalVoiceModelSetting({ voice, onChange }: { voice: VoiceSettings; onChange(voice: VoiceSettings): void }) {
  const model = localVoiceModel(voice.localModelId);
  const setup = useLocalVoiceSetup(model.id);
  const summary = summarizeLocalVoiceSetup(model, setup.status, setup.installing);
  const busy = setup.loading || setup.installing;
  return <SettingRow
    title="Local model"
    description="Free speech-to-text models that run on this computer, so your audio never leaves it."
    control={(
      <div className="space-y-2">
        <div className="flex flex-row items-center gap-2">
          <Select className="min-w-0 flex-1" value={model.id} aria-label="Local voice model"
            onChange={(event) => { if (isLocalVoiceModelId(event.target.value)) onChange({ ...voice, localModelId: event.target.value }); }}>
            {LOCAL_VOICE_MODELS.map((option) => <option key={option.id} value={option.id}><LocalVoiceModelOptionLabel model={option} /></option>)}
          </Select>
          <Button variant="outline" size="icon" className="size-10" onClick={setup.refresh} disabled={busy} aria-label="Refresh local model status">
            <RefreshCcw className={`size-4 ${setup.loading ? "animate-spin" : ""}`} aria-hidden="true" />
          </Button>
          <Button variant="outline" size="sm" className="h-10 gap-2" onClick={setup.install} disabled={busy}>
            <Download className={`size-4 ${setup.installing ? "animate-pulse" : ""}`} aria-hidden="true" />
            {summary.installLabel}
          </Button>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div>{model.description}</div>
          <div className={setup.status && !summary.ready ? "text-foreground" : undefined}>{summary.status}</div>
        </div>
        {setup.error ? <div role="alert" className="text-xs text-destructive">{setup.error}</div> : null}
      </div>
    )}
  />;
}

export function VoiceSettingsSection() {
  const { appSettings, updateVoiceSettings } = useSettingsRuntime();
  const voice = appSettings.voice;
  return (
    <div className="max-w-4xl">
      <SettingsSectionHeader title="Voice" description="Choose how Nora transcribes microphone dictation." icon={Mic2} />
      <SettingRow
        title="Dictation Engine"
        description="Use OpenAI transcription through your API key, or a local model that runs offline on this computer."
        control={(
          <Select value={voice.dictationProvider} aria-label="Voice dictation engine"
            onChange={(event) => updateVoiceSettings({ ...voice, dictationProvider: event.target.value === "local" ? "local" : "openai" })}>
            <option value="openai">OpenAI API</option>
            <option value="local">Local model</option>
          </Select>
        )}
      />
      {voice.dictationProvider === "local" && <LocalVoiceModelSetting voice={voice} onChange={updateVoiceSettings} />}
    </div>
  );
}
