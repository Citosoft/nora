import type { SplashScreenProps } from "@/components/app/types/component.types";

export function SplashScreen({ title, subtitle, children }: SplashScreenProps) {
  return (
    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-background/70 px-8 text-center backdrop-blur-[6px]">
      <img src="./icon.svg" alt="Nora logo" className="h-16 w-16" />
      <div>
        <div className="text-lg font-semibold text-foreground">{title}</div>
        <div className="text-sm text-muted-foreground">{subtitle}</div>
      </div>
      {children ? <div className="w-full max-w-lg">{children}</div> : null}
      <div className="relative flex h-14 w-14 items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-emerald-400/30" />
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-transparent border-t-emerald-400" />
      </div>
    </div>
  );
}
