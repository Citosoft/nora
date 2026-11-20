import { connectorAvailableTo } from "@shared/connectors/access";
import { Select } from "@/components/ui/select";
import { BotConnectorPicker } from "./BotConnectorPicker";
import type { BotConnectorFieldsProps } from "@/components/app/types/botEditor.types";

export function BotConnectorFields({ connectorIds, connectors, error, disabled, workspaceId, botId, recommendations, onChange }: BotConnectorFieldsProps) {
  return <fieldset className="space-y-1.5 text-sm" disabled={disabled}>
    <legend className="mb-1.5 font-medium">Connectors</legend>
    <div className="flex gap-2">
      <Select aria-label="Bot connector access" className="min-w-0 flex-1" disabled={disabled} value={connectorIds === undefined ? "all" : "selected"}
        onChange={(event) => onChange(event.target.value === "all" ? undefined : (connectors ?? [])
          .filter((connector) => connector.enabled && (!workspaceId || connectorAvailableTo(connector.access, { workspaceId, botId })))
          .map((connector) => connector.id))}>
        <option value="all">All available connectors</option>
        <option value="selected">Only selected connectors</option>
      </Select>
      {connectorIds !== undefined && <BotConnectorPicker connectorIds={connectorIds} connectors={connectors} error={error} disabled={disabled}
        workspaceId={workspaceId} botId={botId} recommendations={recommendations} onChange={onChange} />}
    </div>
    <p className="text-xs text-muted-foreground">Applies on the next turn. Provider MCP servers are managed separately.</p>
  </fieldset>;
}
