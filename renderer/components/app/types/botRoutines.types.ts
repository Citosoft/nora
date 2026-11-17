import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { BotDefinition } from "@shared/types/bots/bots.types";
import type { Routine, RoutineInput, RoutineIntervalUnit, RoutineMissedPolicy, RoutineRun, RoutineRunPlace, RoutineScheduleKind } from "@shared/types/bots/routines.types";

export interface BotRoutinesState {
  routines: readonly Routine[];
  runs: readonly RoutineRun[];
  loading: boolean;
  busy: boolean;
  error: string | null;
  create(input: RoutineInput): Promise<boolean>;
  update(id: string, input: RoutineInput): Promise<boolean>;
  setActive(id: string, active: boolean): Promise<boolean>;
  remove(id: string): Promise<boolean>;
  runNow(id: string): Promise<boolean>;
}

/**
 * The editor's form state: every schedule field is kept at once so switching the schedule kind back and forth keeps what the
 * user typed; `routineInputFromDraft` reads only the fields the chosen kind uses.
 */
export interface RoutineDraft {
  name: string;
  instruction: string;
  active: boolean;
  timezone: string;
  workspaceId: string;
  runIn: RoutineRunPlace;
  missedPolicy: RoutineMissedPolicy;
  kind: RoutineScheduleKind;
  time: string;
  minute: number;
  weekday: number;
  day: number;
  amount: number;
  unit: RoutineIntervalUnit;
  /** Kept from the routine being edited so an unchanged interval keeps its rhythm. */
  anchorAt: string | null;
  expression: string;
  date: string;
}

export interface BotRoutinesSectionProps {
  bot: BotDefinition;
  workspaces: readonly NativeWorkspace[];
  currentWorkspace: NativeWorkspace | null;
  /** Opens a run's thread, or null when it is not listed in this window. */
  openerFor(conversationId: string): (() => void) | null;
}
export interface DeleteRoutineDialogProps { routine: Routine; busy: boolean; onConfirm(): void; onClose(): void; }
export interface RoutineRowProps {
  routine: Routine;
  lastRun: RoutineRun | null;
  workspaceName: string;
  disabled: boolean;
  onEdit(): void;
  onToggle(): void;
  onRunNow(): void;
  onRemove(): void;
}
export interface RoutineEditorDialogProps {
  bot: BotDefinition;
  routine: Routine | null;
  /** Workspaces the routine may run in; a workspace bot offers only its own. */
  workspaces: readonly NativeWorkspace[];
  defaultWorkspaceId: string;
  busy: boolean;
  error: string | null;
  onSave(input: RoutineInput): Promise<boolean>;
  onClose(): void;
}
/** The editor's steps in order; a new routine starts by picking a template, an existing one starts at its task. */
export type RoutineEditorStep = "template" | "task" | "schedule" | "delivery";
export interface RoutineEditorStepInfo { id: RoutineEditorStep; title: string; summary: string; complete: boolean; }
/** Shared by every step's fields: the draft, whether the form is locked, and a patch to apply. */
export interface RoutineStepFieldsProps { draft: RoutineDraft; disabled: boolean; onChange(patch: Partial<RoutineDraft>): void; }
export type RoutineScheduleFieldsProps = RoutineStepFieldsProps;
export interface RoutineTaskFieldsProps extends RoutineStepFieldsProps { botName: string; }
export interface RoutineDeliveryFieldsProps extends RoutineStepFieldsProps { workspaces: readonly NativeWorkspace[]; }
export interface RoutineTemplatePickerProps { selectedId: string | null; disabled: boolean; onPick(templateId: string | null): void; }
export interface RoutineEditorStepRailProps { steps: readonly RoutineEditorStepInfo[]; current: RoutineEditorStep; reachable(step: RoutineEditorStep): boolean; onSelect(step: RoutineEditorStep): void; }
export interface RoutineRunListProps { runs: readonly RoutineRun[]; timezoneFor(routineId: string): string; openerFor(conversationId: string): (() => void) | null; }
