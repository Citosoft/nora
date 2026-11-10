import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RolePicker } from "./RolePicker";
import type { RoleSelection } from "@shared/types/personalization/roles.types";
import type { RoleOnboardingProps } from "@/components/app/types/personalization.types";

export function RoleOnboarding({ busy, error, onComplete }: RoleOnboardingProps) {
  const [role, setRole] = useState<RoleSelection | null>({ id: "general" });
  return <main className="mx-auto w-full max-w-2xl p-6 sm:p-10">
    <h1 className="text-3xl font-medium tracking-tight">What kind of work do you do?</h1>
    <p className="mb-7 mt-3 text-muted-foreground">We'll shape your tools and suggestions around you. You can use every available tool, whatever you choose.</p>
    <form onSubmit={(event) => { event.preventDefault(); if (role && !busy) void onComplete(role); }}>
      <RolePicker value={role} onChange={setRole} disabled={busy} />
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-sm text-xs text-muted-foreground">Saved as your app default. Workspaces can have their own role. Personal is created automatically.</p>
        <Button type="submit" disabled={!role || busy}>{busy ? "Setting up…" : "Continue"}</Button>
      </div>
    </form>
  </main>;
}
