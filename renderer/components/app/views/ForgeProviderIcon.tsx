import type { ForgeProviderIconProps } from "@/components/app/types/component.types";
import { cn } from "@/lib/utils";

export function ForgeProviderIcon({
  provider,
  className,
  ...props
}: ForgeProviderIconProps) {
  if (provider === "gitlab") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={cn("fill-current", className)}
        {...props}
      >
        <path d="M12 22 16.42 8.39H7.58L12 22Z" />
        <path d="M12 22 7.58 8.39H1.98L12 22Z" />
        <path d="M1.98 8.39.64 12.51a.9.9 0 0 0 .33 1.01L12 22 1.98 8.39Z" />
        <path d="M1.98 8.39h5.6L5.17 1.02a.45.45 0 0 0-.86 0L1.98 8.39Z" />
        <path d="M12 22 22.02 8.39h-5.6L12 22Z" />
        <path d="M22.02 8.39 23.36 12.51a.9.9 0 0 1-.33 1.01L12 22 22.02 8.39Z" />
        <path d="M22.02 8.39h-5.6l2.41-7.37a.45.45 0 0 1 .86 0l2.33 7.37Z" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("fill-current", className)}
      {...props}
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.11.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.05-.71.08-.69.08-.69 1.16.08 1.77 1.19 1.77 1.19 1.04 1.77 2.72 1.26 3.38.97.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.27-5.24-5.68 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.47.11-3.07 0 0 .97-.31 3.17 1.18a10.9 10.9 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.6.23 2.78.11 3.07.73.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.38-5.25 5.67.41.36.78 1.08.78 2.18 0 1.58-.01 2.85-.01 3.24 0 .3.21.67.79.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}
