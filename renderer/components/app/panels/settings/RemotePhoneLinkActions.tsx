import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";

const COPIED_RESET_MS = 2000;

/** Copy and open buttons for the phone web-app link. The link only opens the app; it grants no access by itself. */
export function RemotePhoneLinkActions({ url, onError }: { url: string; onError(message: string): void }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPIED_RESET_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return <>
    <Button variant="outline" size="sm" onClick={() => { void noraSystemClient.copyText(url).then(() => setCopied(true)).catch(() => onError("Could not copy the link.")); }}>
      {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
      <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
    </Button>
    <Button variant="outline" size="sm" onClick={() => { void noraSystemClient.openExternalUrl(url).catch(() => onError("Could not open the link.")); }}>
      <ExternalLink className="size-3.5" aria-hidden="true" />Open
    </Button>
  </>;
}
