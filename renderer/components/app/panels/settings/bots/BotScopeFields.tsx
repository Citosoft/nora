import { sharedBotFileName, SHARED_BOT_DIRECTORY } from "@shared/bots/botFile";
import { Select } from "@/components/ui/select";
import type { BotScopeFieldsProps } from "@/components/app/types/botEditor.types";

type ScopeChoice = "global" | "private" | "shared";

/** One select for where the bot is available and, for workspace bots, whether it is shared through the repository; the line below explains the choice. */
export function BotScopeFields({ scope, workspace, botId, disabled, onChange }: BotScopeFieldsProps) {
  const file = `${SHARED_BOT_DIRECTORY}/${botId ? sharedBotFileName(botId) : "<name>.md"}`;
  const choice: ScopeChoice = scope.kind === "global" ? "global" : scope.storage;
  const explanation = { global: "In every workspace on this computer.", private: "Saved in Nora on this computer. Nothing is written to the workspace.",
    shared: `Saved as ${file} so collaborators can review and use it.` }[choice];
  const choose = (next: ScopeChoice): void => onChange(next === "global" || !workspace ? { kind: "global" } : { kind: "workspace", workspaceId: workspace.id, storage: next });
  return <div className="space-y-1.5 text-sm">
    <label htmlFor="bot-scope" className="font-medium">Available</label>
    <Select id="bot-scope" value={choice} disabled={disabled || !workspace} onChange={(event) => choose(event.target.value === "private" || event.target.value === "shared" ? event.target.value : "global")}>
      <option value="global">Everywhere</option>
      {workspace && <option value="private">Only in {workspace.name}, private to you</option>}
      {workspace && <option value="shared">Only in {workspace.name}, shared with the repository</option>}
    </Select>
    <p className="text-xs text-muted-foreground">{explanation}</p>
  </div>;
}
