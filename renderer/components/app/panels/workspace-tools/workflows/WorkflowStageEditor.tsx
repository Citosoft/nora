import { useId } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Trash2 } from "lucide-react";
import type { WorkflowStageEditorProps } from "@/components/app/types/workflowSurface.types";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { Field } from "@/components/app/shared/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { canReviewLoop, loopReworkError } from "@shared/loopStages";
import { buildWorkflowAgentSummaries } from "@/components/app/logic/workflowAgents";
import { WorkflowAgentAvatar } from "./WorkflowAgentAvatar";
import { WorkflowAgentFields } from "./WorkflowAgentFields";

export function WorkflowStageEditor({ stage, stages, expanded, onToggle, index, count, bots, onChange, onRemove, onMove, ...agentFields }: WorkflowStageEditorProps) {
  const bot = bots.find((entry) => entry.id === stage.botId);
  const contentId = useId();
  const triggerId = useId();
  const [agent] = buildWorkflowAgentSummaries([stage], agentFields.tools, bots);
  const needsDetails = !stage.name.trim() || !stage.toolId || !stage.instructions.trim() || (stage.kind === "reviewer" && !canReviewLoop(stage.toolId)) || !!loopReworkError(stages);
  return <li className="overflow-hidden rounded-lg border bg-card">
    <div className="flex items-center gap-1 p-2">
      <Button id={triggerId} variant="ghost" className="h-auto min-w-0 flex-1 justify-start gap-3 px-2 py-2 text-left"
        aria-expanded={expanded} aria-controls={contentId} onClick={onToggle}>
        <ChevronDown className={`size-4 shrink-0 text-muted-foreground ${expanded ? "" : "-rotate-90"}`} aria-hidden="true" />
        <WorkflowAgentAvatar agent={agent} size={28} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{index + 1}. {stage.name.trim() || "Untitled stage"}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {stage.kind === "writer" ? "Work" : "Review"} · {agent.toolLabel}{needsDetails ? " · Needs details" : ""}
          </span>
        </span>
      </Button>
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="icon" disabled={index === 0} aria-label={`Move stage ${index + 1} up`} onClick={() => onMove(-1)}><ArrowUp className="size-3.5" aria-hidden="true" /></Button>
        <Button variant="ghost" size="icon" disabled={index === count - 1} aria-label={`Move stage ${index + 1} down`} onClick={() => onMove(1)}><ArrowDown className="size-3.5" aria-hidden="true" /></Button>
        <Button variant="ghost" size="icon" disabled={count === 1} aria-label={`Remove stage ${index + 1}`} onClick={onRemove}><Trash2 className="size-3.5" aria-hidden="true" /></Button>
      </div>
    </div>
    <div id={contentId} aria-labelledby={triggerId} hidden={!expanded}>
      {expanded ? <div className="space-y-4 border-t p-4">
        <Field label="Stage name"><Input value={stage.name} onChange={(event) => onChange({ name: event.target.value })} /></Field>
        <Field label="Stage type"><Select value={stage.kind} onChange={(event) => onChange({ kind: event.target.value === "reviewer" ? "reviewer" : "writer" })}>
          <option value="writer">Work — implement, test, or make changes</option><option value="reviewer">Review — approve or request changes</option>
        </Select></Field>
        <Field label="Assigned to"><Select value={stage.botId ?? ""} onChange={(event) => {
          const selected = bots.find((entry) => entry.id === event.target.value);
          onChange(selected ? { botId: selected.id, toolId: selected.binding.kind, instanceId: selected.binding.instanceId, model: selected.binding.model }
            : { botId: null, toolId: agentFields.tools[0]?.id ?? "", instanceId: null, model: null });
        }}>
          <option value="">Nora / agent</option>
          {stage.botId && !bot ? <option value={stage.botId}>Unavailable bot ({stage.botId})</option> : null}
          {bots.map((entry) => <option key={entry.id} value={entry.id} disabled={(stage.kind === "reviewer" && !canReviewLoop(entry.binding.kind))
            || !agentFields.providers.some((provider) => provider.instanceId === entry.binding.instanceId && provider.kind === entry.binding.kind)}>
              <span className="inline-flex min-w-0 items-center gap-2"><BotAvatar avatar={entry.avatar} size={24} className="shrink-0" /><span className="truncate">{entry.name}</span></span>
            </option>)}
        </Select></Field>
        {stage.botId ? <p className="text-xs text-muted-foreground">{bot ? `${bot.name} uses ${bot.binding.kind} / ${bot.binding.model}. Its latest instructions and model are applied when the run starts.` : "Choose an available bot."}</p>
          : <WorkflowAgentFields {...agentFields} tools={agentFields.tools.filter((tool) => stage.kind !== "reviewer" || canReviewLoop(tool.id))} value={stage} onChange={onChange} />}
        <Field label="If this stage needs rework, return to">
          <Select value={stage.reworkStageId ?? ""} onChange={(event) => onChange({ reworkStageId: event.target.value || null })}>
            <option value="">Stage 1 (default)</option>
            {stage.reworkStageId && !stages.slice(0, index + 1).some((entry) => entry.id === stage.reworkStageId && entry.kind === "writer")
              ? <option value={stage.reworkStageId}>Invalid destination — choose a work stage</option> : null}
            {stages.slice(0, index + 1).filter((entry) => entry.kind === "writer").map((entry) =>
              <option key={entry.id} value={entry.id}>{stages.indexOf(entry) + 1}. {entry.name || "Untitled stage"}</option>)}
          </Select>
        </Field>
        {stage.kind === "reviewer" ? <p className="text-xs text-muted-foreground">Review threads use enforced read-only access. Choose Claude or Codex; run commands and tests in a work stage.</p> : null}
        <Field label="Stage instructions"><Textarea className="min-h-24 resize-none" value={stage.instructions} maxLength={20000}
          onChange={(event) => onChange({ instructions: event.target.value })} /></Field>
        <Button variant="outline" size="sm" onClick={onToggle}>Done</Button>
      </div> : null}
    </div>
  </li>;
}
