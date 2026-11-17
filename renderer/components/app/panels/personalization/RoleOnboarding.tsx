import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppMark } from "@/components/app/shared/AppMark";
import { RolePicker } from "./RolePicker";
import type { RoleSelection } from "@shared/types/personalization/roles.types";
import type { RoleOnboardingProps } from "@/components/app/types/personalization.types";

export function RoleOnboarding({ busy, error, onComplete }: RoleOnboardingProps) {
  const [role, setRole] = useState<RoleSelection | null>({ id: "general" });
  return (
    <main className="role-onboarding relative isolate min-h-0 flex-1 overflow-hidden">
      <div className="h-full overflow-y-auto">
        <div className="relative mx-auto flex min-h-full w-full max-w-lg flex-col items-center justify-center px-6 py-12">
          <div className="mb-8 text-center">
            <AppMark className="role-enter-logo mx-auto mb-6 size-12" />
            <div className="role-enter-copy">
              <h1 className="text-[26px] font-normal leading-tight tracking-tight sm:text-[28px]">What type of work do you do?</h1>
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                Customize Nora to fit the way you work
              </p>
            </div>
          </div>

          <form className="w-full max-w-[336px]" aria-busy={busy} onSubmit={(event) => {
            event.preventDefault();
            if (role && !busy) void onComplete(role);
          }}>
            <RolePicker value={role} onChange={setRole} disabled={busy} variant="compact" />
            {error && <p role="alert" className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
            <div className="role-enter-actions">
              <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">You can change this anytime in settings.</p>
              <div className="mt-8 flex flex-col items-center gap-3">
                <Button variant="secondary" type="submit" className="h-12 w-full rounded-full bg-foreground text-sm font-normal text-background hover:bg-foreground/90" disabled={!role || busy}>
                  {busy ? "Setting up…" : "Continue"}
                  {busy && <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />}
                </Button>
                <Button variant="ghost" type="button" className="h-10 rounded-full px-5 text-sm font-normal text-muted-foreground" disabled={busy} onClick={() => void onComplete({ id: "general" })}>Skip</Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
