import { getTerminalFontFamily, getTerminalPreviewPalette } from "@/components/app/logic/terminalPresentation";
import type { ResolvedTheme, TerminalFontId, TerminalThemeId } from "@/components/app/types";
import { ForgeProviderIcon } from "@/components/app/views/ForgeProviderIcon";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function TerminalThemePreview({
  terminalThemeId,
  terminalFontId,
  resolvedTheme
}: {
  terminalThemeId: TerminalThemeId;
  terminalFontId: TerminalFontId;
  resolvedTheme: ResolvedTheme;
}) {
  const palette = getTerminalPreviewPalette(terminalThemeId, resolvedTheme);
  const fontFamily = getTerminalFontFamily(terminalFontId);

  return (
    <div
      className="overflow-hidden rounded-[6px] border border-border/70 shadow-sm"
      style={{ backgroundColor: palette.background, color: palette.foreground }}
    >
      <div
        className="flex items-center justify-between border-b px-3 py-2 text-[11px]"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-red-400" />
          <span className="size-2 rounded-full bg-yellow-400" />
          <span className="size-2 rounded-full bg-green-400" />
        </div>
        <span className="font-medium opacity-80">terminal-preview</span>
      </div>
      <div className="space-y-2 px-3 py-3 text-[11px] leading-5" style={{ fontFamily }}>
        <div>
          <span style={{ color: palette.green }}>you@nora</span>
          <span style={{ color: palette.foreground }}>:~$ </span>
          <span style={{ color: palette.blue }}>npm run dev</span>
        </div>
        <div>
          <span style={{ color: palette.cyan }}>ready</span>
          <span style={{ color: palette.foreground }}> on </span>
          <span style={{ color: palette.magenta }}>http://localhost:3000</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: palette.red }}>ERR</span>
          <span style={{ color: palette.yellow }}>WARN</span>
          <span style={{ color: palette.green }}>OK</span>
          <span style={{ color: palette.white }}>TEXT</span>
          <span style={{ color: palette.black, opacity: 0.8 }}>DIM</span>
        </div>
      </div>
    </div>
  );
}

export function SettingRow({
  title,
  description,
  control
}: {
  title: ReactNode;
  description: string;
  control: ReactNode;
}) {
  return (
    <div className="grid gap-4 border-b border-border/60 py-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="mt-1 text-sm leading-6 text-muted-foreground">{description}</div>
      </div>
      <div className="min-w-0">{control}</div>
    </div>
  );
}

export function IntegrationTitle({
  provider,
  label
}: {
  provider: "github" | "gitlab" | "vercel";
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {provider === "vercel" ? (
        <svg viewBox="0 0 24 24" className="size-4 shrink-0 fill-current" aria-hidden="true">
          <path d="M12 4 20 18H4L12 4Z" />
        </svg>
      ) : (
        <ForgeProviderIcon provider={provider} className="size-4 shrink-0" />
      )}
      <span>{label}</span>
    </div>
  );
}

export function ToggleButton({
  checked,
  onChange,
  label
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        "flex w-full items-center justify-between rounded-[4px] border px-3 py-2 text-left transition",
        checked
          ? "border-primary/40 bg-primary/10 text-foreground"
          : "border-border/70 bg-background/50 text-muted-foreground hover:border-primary/25 hover:text-foreground"
      ].join(" ")}
    >
      <span className="text-sm">{label}</span>
      <span
        className={[
          "relative inline-flex h-5 w-9 shrink-0 rounded-full transition",
          checked ? "bg-primary" : "bg-muted"
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 size-4 rounded-full bg-white transition",
            checked ? "left-[18px]" : "left-0.5"
          ].join(" ")}
        />
      </span>
    </button>
  );
}

export function SettingsSectionHeader({
  title,
  description,
  icon: Icon
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <>
      <div className="flex items-center gap-2 text-foreground">
        <Icon className="size-5" aria-hidden="true" />
        <div className="text-xl font-semibold">{title}</div>
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{description}</div>
    </>
  );
}
