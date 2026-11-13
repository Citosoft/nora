import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const button = cn(buttonVariants({ variant: "default", size: "default" }), "w-full normal-case tracking-normal");
const secondaryButton = cn(buttonVariants({ variant: "outline", size: "default" }), "w-full normal-case tracking-normal");
const link = "rounded-sm text-xs font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const iconButton = cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-7 text-muted-foreground");

// Keep authentication compact without constraining the wider account-management dialog.
const authElements = {
  cardBox: "w-[min(380px,calc(100vw-3rem))] overflow-hidden rounded-lg border border-border bg-card shadow-panel",
  card: "gap-5 rounded-none border-0 bg-transparent p-6 shadow-none",
  header: "gap-0 text-left",
  headerTitle: "text-base font-semibold tracking-tight text-foreground",
  headerSubtitle: "text-xs leading-relaxed text-muted-foreground empty:hidden",
  logoBox: "hidden",
  main: "gap-5",
  form: "gap-4",
  formFieldRow: "gap-4",
  formField: "gap-1.5",
  footer: "border-t border-border bg-muted/30 px-6 py-4",
  footerAction: "gap-1.5 p-0",
  footerActionText: "text-xs text-muted-foreground",
  footerActionLink: link
} as const;

/** Clerk's supported theme layer lets Nora's existing controls override vendor defaults. */
export const accountAppearance = {
  theme: "simple",
  cssLayerName: "clerk",
  variables: {
    colorPrimary: "hsl(var(--primary))", colorPrimaryForeground: "hsl(var(--primary-foreground))",
    colorBackground: "hsl(var(--card))", colorForeground: "hsl(var(--foreground))",
    colorMuted: "hsl(var(--muted))", colorMutedForeground: "hsl(var(--muted-foreground))",
    colorInput: "hsl(var(--background))", colorInputForeground: "hsl(var(--foreground))",
    colorBorder: "hsl(var(--border))", colorDanger: "hsl(var(--destructive))", colorRing: "hsl(var(--ring))",
    fontFamily: "var(--app-ui-font), var(--app-system-font)",
    fontSize: "13px", borderRadius: "var(--radius-control)"
  },
  elements: {
    modalBackdrop: "bg-background/80 p-6 backdrop-blur-sm",
    modalCloseButton: iconButton,
    cardBox: "rounded-lg border border-border bg-card shadow-panel",
    card: "bg-card shadow-none",
    headerTitle: "text-base font-semibold tracking-tight text-foreground",
    headerSubtitle: "text-xs text-muted-foreground",
    formFieldLabel: "text-xs font-medium text-foreground",
    formFieldInput: "form-control-surface h-9 rounded-md border px-3 py-2 text-[13px] text-foreground shadow-none transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
    formFieldInputShowPasswordButton: iconButton,
    formFieldHintText: "text-xs leading-relaxed text-muted-foreground",
    formFieldErrorText: "text-xs leading-relaxed text-destructive",
    formFieldAction: link,
    formButtonPrimary: button,
    socialButtonsBlockButton: secondaryButton,
    socialButtonsBlockButtonText: "text-[12.5px] font-medium text-foreground",
    socialButtonsProviderIcon: "size-4",
    dividerLine: "bg-border",
    dividerText: "text-[11px] text-muted-foreground",
    identityPreview: "rounded-md border border-border bg-muted/30 px-3 py-2",
    identityPreviewText: "text-xs text-foreground",
    identityPreviewEditButton: iconButton,
    otpCodeFieldInput: "form-control-surface size-10 rounded-md border text-base text-foreground shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    alert: "rounded-md border border-border bg-muted/30 p-3 text-xs",
    footerActionLink: link,
    avatarBox: "size-10",
    userButtonPopoverCard: "rounded-lg border border-border bg-popover shadow-panel",
    profileSectionTitleText: "text-sm font-semibold text-foreground",
    profileSectionPrimaryButton: cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-xs")
  },
  options: { socialButtonsPlacement: "top", socialButtonsVariant: "blockButton" },
  signIn: { elements: authElements },
  signUp: { elements: authElements }
} as const;
