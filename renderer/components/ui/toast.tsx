import { cn } from "@/lib/utils";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-lg border px-3.5 py-3 text-sm antialiased shadow-sm",
  {
    variants: {
      variant: {
        info: "border-border/80 bg-card text-foreground shadow-black/[0.04] dark:shadow-black/30",
        success:
          "border-emerald-800/25 bg-emerald-600 text-white shadow-emerald-950/15 dark:border-emerald-400/20 dark:bg-emerald-600 dark:text-white",
        error: "border-destructive/90 bg-destructive text-destructive-foreground shadow-destructive/10"
      }
    },
    defaultVariants: {
      variant: "info"
    }
  }
);

export const ToastProvider = ToastPrimitive.Provider;

export const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-4 right-4 z-[120] flex max-h-screen w-[min(400px,calc(100vw-2rem))] flex-col-reverse gap-2.5 p-0 outline-none",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

export const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => (
  <ToastPrimitive.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props} />
));
Toast.displayName = ToastPrimitive.Root.displayName;

export const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title ref={ref} className={cn("text-sm font-semibold leading-snug tracking-tight", className)} {...props} />
));
ToastTitle.displayName = ToastPrimitive.Title.displayName;

export const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description ref={ref} className={cn("text-[13px] leading-relaxed", className)} {...props} />
));
ToastDescription.displayName = ToastPrimitive.Description.displayName;
