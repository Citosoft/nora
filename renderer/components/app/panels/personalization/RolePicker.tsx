import { useId, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { roleProfiles } from "@shared/personalization/profiles";
import type { RolePickerProps } from "@/components/app/types/personalization.types";
import { presetRoleSchema } from "@shared/personalization/contracts";

export function RolePicker({ value, onChange, disabled }: RolePickerProps) {
  const id = useId();
  const [custom, setCustom] = useState(value?.id === "custom" ? value.description : "");
  const [selected, setSelected] = useState(value?.id ?? "general");
  const profile = roleProfiles.find((entry) => entry.id === selected);
  return <div className="space-y-4">
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="text-sm font-medium">Choose your starting point</legend>
      <div className="grid gap-2 sm:grid-cols-2">{roleProfiles.map((role) => <label key={role.id}
        className={`flex min-h-12 items-center gap-3 rounded-lg border p-3 text-sm ${selected === role.id ? "border-foreground bg-muted" : "border-border"}`}>
        <input type="radio" name={id} checked={selected === role.id} onChange={() => {
          setSelected(role.id);
          if (role.id === "custom") onChange(custom.trim() ? { id: "custom", description: custom.trim() } : null);
          else onChange({ id: presetRoleSchema.parse(role.id) });
        }} />{role.label}
      </label>)}</div>
    </fieldset>
    {selected === "custom" && <div><label htmlFor={`${id}-custom`} className="text-sm">Describe your role</label>
      <Textarea id={`${id}-custom`} disabled={disabled} maxLength={500} value={custom} className="mt-2"
        onChange={(event) => { const description = event.target.value; setCustom(description);
          onChange(description.trim() ? { id: "custom", description: description.trim() } : null); }} />
      <p className="mt-1 text-xs text-muted-foreground">Up to 500 characters. Starts with General tools.</p></div>}
    <div aria-live="polite" className="rounded-lg bg-muted p-4 text-sm">
      <p className="font-medium">{profile?.label}</p>
      <p className="mt-1 text-muted-foreground">{profile?.guidance}</p>
      <p className="mt-2 text-xs text-muted-foreground">Suggested tools: {profile?.tools.join(", ")}. Available tools depend on this workspace and provider.</p>
    </div>
  </div>;
}
