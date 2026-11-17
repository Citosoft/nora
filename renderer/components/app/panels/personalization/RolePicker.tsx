import { useId, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { rolePresentation } from "@/components/app/constants/rolePresentation";
import { roleProfiles } from "@shared/personalization/profiles";
import type { RolePickerProps } from "@/components/app/types/personalization.types";
import { presetRoleSchema } from "@shared/personalization/contracts";

export function RolePicker({ value, onChange, disabled, variant = "cards" }: RolePickerProps) {
  const compact = variant === "compact";
  const id = useId();
  const [custom, setCustom] = useState(value?.id === "custom" ? value.description : "");
  const [selected, setSelected] = useState(value?.id ?? "general");
  const profile = roleProfiles.find((entry) => entry.id === selected);
  return <div className="role-picker space-y-4">
    <fieldset disabled={disabled}>
      <legend className={compact ? "sr-only" : "mb-3 text-xs font-medium text-muted-foreground"}>Choose your starting point</legend>
      <div className={compact ? "grid grid-cols-2 gap-2" : "grid gap-2.5 sm:grid-cols-2"}>
        {roleProfiles.map((role, index) => {
          const { icon: Icon, shortLabel, description } = rolePresentation[role.id];
          return (
            <label key={role.id} style={compact ? { animationDelay: `${180 + index * 45}ms` } : undefined}
              className={`role-option relative flex cursor-pointer items-center rounded-xl border text-sm ${compact ? "role-option-compact min-h-10 justify-center px-7 py-2.5" : "gap-3 p-3.5"}`}>
              <input type="radio" className="sr-only" name={id} value={role.id} checked={selected === role.id}
                aria-label={role.label}
                aria-describedby={`${id}-${role.id}-description`} onChange={() => {
                  setSelected(role.id);
                  if (role.id === "custom") onChange(custom.trim() ? { id: "custom", description: custom.trim() } : null);
                  else onChange({ id: presetRoleSchema.parse(role.id) });
                }} />
              {!compact && <span className="role-option-icon flex size-10 shrink-0 items-center justify-center rounded-xl" aria-hidden="true">
                <Icon className="size-5" strokeWidth={1.7} />
              </span>}
              <span className={compact ? "min-w-0 text-center" : "min-w-0 flex-1"}>
                <span className={`block text-[13px] leading-snug text-foreground ${compact ? "font-normal" : "font-medium"}`}>{compact ? shortLabel : role.label}</span>
                <span id={`${id}-${role.id}-description`} className={compact ? "sr-only" : "mt-1 block text-[11px] leading-snug text-muted-foreground"}>{description}</span>
              </span>
              <span className="role-option-check flex size-4 shrink-0 items-center justify-center rounded-full border" aria-hidden="true">
                <Check className="size-2.5" strokeWidth={3} />
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
    {selected === "custom" && <div>
      <label htmlFor={`${id}-custom`} className="text-sm font-medium">Describe your role</label>
      <Textarea id={`${id}-custom`} disabled={disabled} maxLength={500} value={custom} className="mt-2 rounded-xl"
        placeholder="Tell us a little about what you do…" aria-describedby={`${id}-custom-hint`}
        onChange={(event) => {
          const description = event.target.value;
          setCustom(description);
          onChange(description.trim() ? { id: "custom", description: description.trim() } : null);
        }} />
      <p id={`${id}-custom-hint`} className="mt-2 text-xs text-muted-foreground">Up to 500 characters. Starts with General tools.</p>
    </div>}
    {!compact && <div aria-live="polite" aria-atomic="true" className="role-preview flex items-start gap-3 rounded-xl border border-primary/15 p-4 text-sm">
      <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs font-medium">Your starting point · {profile?.label}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{profile?.starters.join(" · ")}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Suggested tools: {profile?.tools.join(", ")}. Availability depends on your workspace and provider.</p>
      </div>
    </div>}
  </div>;
}
