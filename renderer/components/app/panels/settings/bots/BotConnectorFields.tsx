import { connectorAvailableTo } from "@shared/connectors/access";
import { Select } from "@/components/ui/select";
import { BotConnectorPicker } from "./BotConnectorPicker";
import type { BotConnectorFieldsProps } from "@/components/app/types/botEditor.types";

/** Nora connectors are opt-in per bot: each one adds its full tool list to every turn. */
export function BotConnectorFields({ connectorIds, connectors, error, disabled, workspaceId, botId, recommendations, onChange }: BotConnectorFieldsProps) {
  const available = (connectors ?? [])
    .filter((connector) => connector.enabled && (!workspaceId || connectorAvailableTo(connector.access, { workspaceId, botId })))
    .map((connector) => connector.id);
  const selected = connectorIds ?? [];
  const mode = selected.length === 0 ? "none" : available.length > 0 && available.every((id) => selected.includes(id)) && selected.length >= available.length
    ? "all" : "selected";
  return <fieldset className="space-y-1.5 text-sm" disabled={disabled}>
    <legend className="mb-1.5 font-medium">Connectors</legend>
    <div className="flex gap-2">
      <Select aria-label="Bot connector access" className="min-w-0 flex-1" disabled={disabled} value={mode}
        onChange={(event) => {
          if (event.target.value === "none") onChange([]);
          else if (event.target.value === "all") onChange(available);
          else onChange(selected.length ? [...selected] : available.slice(0, 1));
        }}>
        <option value="none">No connectors</option>
        <option value="selected">Only selected connectors</option>
        <option value="all">All available connectors</option>
      </Select>
      {mode === "selected" && <BotConnectorPicker connectorIds={selected} connectors={connectors} error={error} disabled={disabled}
        workspaceId={workspaceId} botId={botId} recommendations={recommendations} onChange={onChange} />}
    </div>
    <p className="text-xs text-muted-foreground">Opt-in: each connector adds its tools to every turn. Applies on the next turn. Provider MCP servers are managed separately.</p>
  </fieldset>;
}
