import { useContext, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { effectiveRole, roleProfile, roleSelectionLabel } from "@shared/personalization/profiles";
import { presetRoleSchema } from "@shared/personalization/contracts";
import type { RoleSelection } from "@shared/types/personalization/roles.types";
import { rolePresentation } from "@/components/app/constants/rolePresentation";
import { NativeRuntimeContext } from "@/components/app/context/nativeRuntimeContext";
import { ThreadCenterContext } from "@/components/app/context/threadWorkspaceContext";
import { RoleSwitcherPanel } from "@/components/app/chrome/role-switcher/RoleSwitcherPanel";
import type { RoleSwitcherChoice, TitleBarRoleMenuProps, TitleBarRoleSwitcherProps } from "@/components/app/types/windowChrome.types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const PRESET_CHOICES: readonly RoleSwitcherChoice[] = presetRoleSchema.options.map((id) =>
  ({ selection: { id }, label: roleProfile({ id }).label, presentation: rolePresentation[id] }));

/** Switches the app-wide work role, which shapes the sidebar, starters and Nora's guidance across the app. */
export function TitleBarRoleSwitcher(props: TitleBarRoleSwitcherProps) {
  // Chrome previews and harnesses render the title bar without the native runtime; there is no role to switch there.
  const native = useContext(NativeRuntimeContext);
  const focusedWorkspaceId = useContext(ThreadCenterContext)?.state.layout.focusedWorkspaceId ?? null;
  return native ? <RoleMenu {...props} native={native} focusedWorkspaceId={focusedWorkspaceId} /> : null;
}

function RoleMenu({ compact, iconToneClass, native: { boot, request }, focusedWorkspaceId }: TitleBarRoleMenuProps) {
  const [error, setError] = useState<string | null>(null);
  const role = boot.personalization.defaultRole;
  const workspace = boot.workspaces.find((entry) => entry.id === focusedWorkspaceId);
  // A workspace with its own role keeps it whatever the app role is, so say so rather than appear not to switch.
  const override = workspace && Object.hasOwn(boot.personalization.workspaceRoles, workspace.id) ? effectiveRole(boot.personalization, workspace.id) : null;
  const choices = useMemo(() => role?.id === "custom"
    ? [...PRESET_CHOICES, { selection: role, label: "Custom role", presentation: { ...rolePresentation.custom, description: role.description } }]
    : PRESET_CHOICES, [role]);
  const label = role ? roleSelectionLabel(role) : "Choose role";
  const Icon = rolePresentation[role?.id ?? "general"].icon;
  const choose = (next: RoleSelection): void => {
    if (next.id === role?.id) return;
    setError(null);
    void request({ kind: "set-role", workspaceId: null, role: next })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Your role could not be saved."));
  };
  const note = error ? { text: error, tone: "error" as const }
    : override && workspace ? { text: `${workspace.name} keeps ${roleSelectionLabel(override)}`, tone: "info" as const } : null;
  return <Popover>
    <PopoverTrigger asChild>
      <button type="button" aria-label={`Work role: ${label}. Change role`} title={`Work role: ${label}`}
        className={cn("app-no-drag flex h-8 min-w-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition hover:bg-accent/60 hover:text-foreground data-[state=open]:bg-accent/60 data-[state=open]:text-foreground", iconToneClass)}>
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        {!compact && <span className="max-w-[10rem] truncate">{label}</span>}
        <ChevronDown className="size-3 shrink-0 opacity-70" aria-hidden="true" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="end" sideOffset={6} aria-label="Work role" className="w-[17.5rem] overflow-hidden rounded-xl p-0">
      <RoleSwitcherPanel choices={choices} current={role} note={note} onChoose={choose} />
    </PopoverContent>
  </Popover>;
}
