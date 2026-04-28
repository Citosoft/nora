import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select } from "@/components/ui/select";
import type { TerminalPreset, TerminalShellOption } from "@shared/appTypes";
import { GripVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

type TerminalPresetsSettingsSectionProps = {
  presets: TerminalPreset[];
  terminalShells: TerminalShellOption[];
  defaultWorkingDirectory?: string;
  onChange: (presets: TerminalPreset[]) => void;
};

type EditablePreset = {
  name: string;
  shellId: string | null;
  workingDirectory: string;
  commands: string[];
};

function createEmptyPreset(defaultWorkingDirectory = ""): TerminalPreset {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `preset-${Date.now()}`,
    name: "",
    shellId: null,
    workingDirectory: defaultWorkingDirectory,
    commands: []
  };
}

function createEditablePreset(preset: TerminalPreset): EditablePreset {
  return {
    name: preset.name,
    shellId: preset.shellId ?? null,
    workingDirectory: preset.workingDirectory,
    commands: preset.commands
  };
}

function normalizeCommands(commands: string[]): string[] {
  const nextCommands = commands
    .map((command) => command.trim())
    .filter((command) => command.length > 0);
  return nextCommands;
}

function formatCommands(commands: string[]): string {
  const summary = commands
    .map((command) => command.trim())
    .filter((command) => command.length > 0)
    .join(" && ");
  return summary || "No commands configured";
}

export function TerminalPresetsSettingsSection({
  presets,
  terminalShells,
  defaultWorkingDirectory,
  onChange
}: TerminalPresetsSettingsSectionProps) {
  const nextPresets = presets.length ? presets : [];
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditablePreset | null>(null);
  const [newCommandText, setNewCommandText] = useState("");
  const [isAddCommandOpen, setIsAddCommandOpen] = useState(false);
  const [draggedCommandIndex, setDraggedCommandIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!editingPresetId) {
      return;
    }

    const activePreset = nextPresets.find((preset) => preset.id === editingPresetId) ?? null;
    if (!activePreset) {
      setEditingPresetId(null);
      setDraft(null);
      setNewCommandText("");
      setIsAddCommandOpen(false);
      setDraggedCommandIndex(null);
    }
  }, [editingPresetId, nextPresets]);

  return (
    <div className="space-y-4">
      <div className="rounded-[6px] border border-border/60 bg-card/40 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-foreground">Terminal presets</div>
            <div className="mt-1 text-sm leading-6 text-muted-foreground">
              Save reusable terminal launches. Commands are chained in order. Edit command lists with `&&` between commands.
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const nextPreset = createEmptyPreset(defaultWorkingDirectory);
              onChange([...nextPresets, nextPreset]);
              setEditingPresetId(nextPreset.id);
              setDraft(createEditablePreset(nextPreset));
              setNewCommandText("");
              setIsAddCommandOpen(false);
              setDraggedCommandIndex(null);
            }}
          >
            <Plus className="size-4" />
            Add preset
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[6px] border border-border/60 bg-background/30">
        <div className="grid grid-cols-[minmax(0,1fr)_150px_minmax(0,1fr)_minmax(0,1.5fr)_160px] border-b border-border/60 bg-card/50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <div>Name</div>
          <div>Shell</div>
          <div>Directory</div>
          <div>Commands</div>
          <div className="text-right">Actions</div>
        </div>

        {nextPresets.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">
            No presets yet.
          </div>
        ) : null}

        {nextPresets.map((preset, presetIndex) => {
          const isEditing = preset.id === editingPresetId;
          const visibleCommands = isEditing && draft ? normalizeCommands(draft.commands) : [];

          return (
            <div
              key={preset.id}
              className="grid grid-cols-[minmax(0,1fr)_150px_minmax(0,1fr)_minmax(0,1.5fr)_160px] items-center gap-4 border-b border-border/60 px-4 py-3 last:border-b-0"
            >
              {isEditing && draft ? (
                <>
                  <Input
                    value={draft.name}
                    placeholder={`Preset ${presetIndex + 1}`}
                    onChange={(event) => {
                      const name = event.target.value;
                      setDraft((current) => (current ? { ...current, name } : current));
                    }}
                  />
                  <Select
                    value={draft.shellId || ""}
                    onChange={(event) => {
                      const shellId = event.target.value || null;
                      setDraft((current) => (current ? { ...current, shellId } : current));
                    }}
                  >
                    <option value="">Default shell</option>
                    {terminalShells.map((shell) => (
                      <option key={shell.id} value={shell.id}>
                        {shell.label}
                      </option>
                    ))}
                  </Select>
                  <Input
                    value={draft.workingDirectory}
                    placeholder={defaultWorkingDirectory || "apps/web"}
                    onChange={(event) => {
                      const workingDirectory = event.target.value;
                      setDraft((current) => (current ? { ...current, workingDirectory } : current));
                    }}
                  />
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      {visibleCommands.map((command, commandIndex) => (
                        <div
                          key={`${preset.id}:${commandIndex}`}
                          draggable
                          onDragStart={() => setDraggedCommandIndex(commandIndex)}
                          onDragEnd={() => setDraggedCommandIndex(null)}
                          onDragOver={(event) => {
                            event.preventDefault();
                          }}
                          onDrop={() => {
                            if (draggedCommandIndex === null || draggedCommandIndex === commandIndex) {
                              setDraggedCommandIndex(null);
                              return;
                            }

                            setDraft((current) => {
                              if (!current) {
                                return current;
                              }

                              const nextCommands = normalizeCommands(current.commands);
                              const [movedCommand] = nextCommands.splice(draggedCommandIndex, 1);
                              nextCommands.splice(commandIndex, 0, movedCommand);
                              return {
                                ...current,
                                commands: nextCommands
                              };
                            });
                            setDraggedCommandIndex(null);
                          }}
                          className={[
                            "flex min-w-0 items-center gap-1 rounded-[4px] border px-2 py-1 text-xs text-foreground",
                            draggedCommandIndex === commandIndex
                              ? "border-primary/50 bg-primary/10"
                              : "border-border/60 bg-card/40"
                          ].join(" ")}
                        >
                          <span
                            className="cursor-grab shrink-0 text-muted-foreground active:cursor-grabbing"
                            aria-hidden="true"
                          >
                            <GripVertical className="size-3.5" />
                          </span>
                          <span className="shrink-0 text-muted-foreground">{commandIndex + 1}.</span>
                          <span className="truncate">{command}</span>
                          <button
                            type="button"
                            className="shrink-0 text-muted-foreground transition hover:text-foreground"
                            aria-label={`Remove command ${commandIndex + 1}`}
                            onClick={() => {
                              setDraft((current) => (
                                current
                                  ? {
                                      ...current,
                                      commands: normalizeCommands(current.commands).filter((_, index) => index !== commandIndex)
                                    }
                                  : current
                              ));
                            }}
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ))}
                      {visibleCommands.length === 0 ? (
                        <span className="text-sm text-muted-foreground">No commands</span>
                      ) : null}
                    </div>
                    <Popover open={isAddCommandOpen} onOpenChange={setIsAddCommandOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Add another command"
                        >
                          <Plus className="size-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 space-y-3">
                        <div className="text-sm font-medium text-foreground">Add command</div>
                        <Input
                          value={newCommandText}
                          placeholder="npm run dev"
                          onChange={(event) => setNewCommandText(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter") {
                              return;
                            }

                            event.preventDefault();
                            const nextCommand = newCommandText.trim();
                            if (!nextCommand) {
                              return;
                            }

                            setDraft((current) => (
                              current
                                ? {
                                    ...current,
                                    commands: [...current.commands.filter((command) => command.trim().length > 0), nextCommand]
                                  }
                                : current
                            ));
                            setNewCommandText("");
                            setIsAddCommandOpen(false);
                          }}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsAddCommandOpen(false);
                              setNewCommandText("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              const nextCommand = newCommandText.trim();
                              if (!nextCommand) {
                                return;
                              }

                              setDraft((current) => (
                                current
                                  ? {
                                      ...current,
                                      commands: [...current.commands.filter((command) => command.trim().length > 0), nextCommand]
                                    }
                                  : current
                              ));
                              setNewCommandText("");
                              setIsAddCommandOpen(false);
                            }}
                            disabled={!newCommandText.trim()}
                          >
                            Add
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onChange(nextPresets.map((entry) => (
                          entry.id === preset.id
                            ? {
                                ...entry,
                                name: draft.name,
                                shellId: draft.shellId,
                                workingDirectory: draft.workingDirectory,
                                commands: draft.commands.filter((command) => command.trim().length > 0)
                              }
                            : entry
                        )));
                        setEditingPresetId(null);
                        setDraft(null);
                        setNewCommandText("");
                        setIsAddCommandOpen(false);
                        setDraggedCommandIndex(null);
                      }}
                    >
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Cancel preset edit"
                      onClick={() => {
                        setEditingPresetId(null);
                        setDraft(null);
                        setNewCommandText("");
                        setIsAddCommandOpen(false);
                        setDraggedCommandIndex(null);
                      }}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="truncate text-sm font-medium text-foreground">
                    {preset.name.trim() || `Preset ${presetIndex + 1}`}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    {terminalShells.find((shell) => shell.id === (preset.shellId ?? ""))?.label || "Default"}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    {preset.workingDirectory.trim() || "."}
                  </div>
                  <div className="truncate text-sm text-muted-foreground" title={formatCommands(preset.commands)}>
                    {formatCommands(preset.commands)}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingPresetId(preset.id);
                        setDraft(createEditablePreset(preset));
                      }}
                    >
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${preset.name.trim() || `preset ${presetIndex + 1}`}`}
                      onClick={() => onChange(nextPresets.filter((entry) => entry.id !== preset.id))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
