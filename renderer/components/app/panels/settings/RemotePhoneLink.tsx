import { useMemo, useState } from "react";
import qrcode from "qrcode-generator";
import { Button } from "@/components/ui/button";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";

export function RemotePhoneLink({ url }: { url: string }) {
  const [message, setMessage] = useState("");
  const qr = useMemo(() => {
    const code = qrcode(0, "M"); code.addData(url); code.make();
    const count = code.getModuleCount();
    const cells: string[] = [];
    for (let row = 0; row < count; row += 1) for (let col = 0; col < count; col += 1) {
      if (code.isDark(row, col)) cells.push(`M${col + 4},${row + 4}h1v1h-1z`);
    }
    return { size: count + 8, path: cells.join("") };
  }, [url]);
  return <div className="space-y-3">
    <a className="break-all text-primary underline" href={url} onClick={(event) => { event.preventDefault(); void noraSystemClient.openExternalUrl(url).catch(() => setMessage("Could not open the link.")); }}>{url}</a>
    <svg role="img" aria-label="QR code to open Nora on your phone" viewBox={`0 0 ${qr.size} ${qr.size}`} className="size-40" shapeRendering="crispEdges"><rect width={qr.size} height={qr.size} fill="white" /><path d={qr.path} fill="black" /></svg>
    <Button variant="outline" size="sm" onClick={() => { void noraSystemClient.copyText(url).then(() => setMessage("Link copied.")).catch(() => setMessage("Could not copy the link.")); }}>Copy link</Button>
    <p className="text-xs text-muted-foreground">This link only opens the app; it grants no access by itself.</p><p role="status" className="text-sm">{message}</p>
  </div>;
}
