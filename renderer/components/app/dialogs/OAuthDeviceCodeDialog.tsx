import type { OAuthDeviceCodeDialogProps } from "@/components/app/types/component.types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Copy, ExternalLink, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";

export function OAuthDeviceCodeDialog({
  open,
  prompt,
  onOpenChange,
  onCopyCode,
  onOpenVerificationUrl
}: OAuthDeviceCodeDialogProps) {
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied" | "failed">("idle");
  const userCode = prompt?.userCode || "";
  const verificationUri = prompt?.verificationUri || "";
  const providerLabel = prompt?.providerLabel || "Provider";

  useEffect(() => {
    if (!open) {
      setCopyState("idle");
      return;
    }

    if (copyState !== "copied" && copyState !== "failed") {
      return;
    }

    const timer = window.setTimeout(() => {
      setCopyState("idle");
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [copyState, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        headerTitle={(
          <span className="flex items-center gap-2">
            <KeyRound className="size-4 text-primary" />
            {providerLabel} Device Login
          </span>
        )}
      >
        <DialogHeader>
          <DialogDescription>
            Enter this code on the provider verification page to finish sign-in.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="rounded-[6px] border border-border/60 bg-card/50 px-3 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Device code</div>
            <div className="mt-1 font-mono text-lg font-semibold tracking-[0.08em] text-foreground">{userCode || "Unavailable"}</div>
          </div>
          <div className="rounded-[6px] border border-border/60 bg-card/50 px-3 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Verification URL</div>
            <div className="mt-1 break-all text-sm text-foreground">{verificationUri || "Unavailable"}</div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              if (!userCode || copyState === "copying") {
                return;
              }
              setCopyState("copying");
              void Promise.resolve()
                .then(() => onCopyCode(userCode))
                .then(() => {
                  setCopyState("copied");
                })
                .catch(() => {
                  setCopyState("failed");
                });
            }}
            disabled={!userCode || copyState === "copying"}
          >
            <Copy className="size-4" />
            {copyState === "copying"
              ? "Copying..."
              : copyState === "copied"
                ? "Copied"
                : copyState === "failed"
                  ? "Copy Failed"
                  : "Copy Code"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (verificationUri) {
                onOpenVerificationUrl(verificationUri);
              }
            }}
            disabled={!verificationUri}
          >
            <ExternalLink className="size-4" />
            Open Verification Page
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
