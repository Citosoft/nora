import { useMemo } from "react";
import qrcode from "qrcode-generator";

const QUIET_ZONE = 2;

/** A crisp black-on-white QR code for a URL; white keeps it scannable in dark mode. */
export function QrCode({ value, label, className = "size-24" }: { value: string; label: string; className?: string }) {
  const qr = useMemo(() => {
    const code = qrcode(0, "M"); code.addData(value); code.make();
    const count = code.getModuleCount();
    const cells: string[] = [];
    for (let row = 0; row < count; row += 1) for (let col = 0; col < count; col += 1) {
      if (code.isDark(row, col)) cells.push(`M${col + QUIET_ZONE},${row + QUIET_ZONE}h1v1h-1z`);
    }
    return { size: count + QUIET_ZONE * 2, path: cells.join("") };
  }, [value]);
  return <svg role="img" aria-label={label} viewBox={`0 0 ${qr.size} ${qr.size}`} className={`shrink-0 rounded-md ${className}`} shapeRendering="crispEdges">
    <rect width={qr.size} height={qr.size} fill="white" /><path d={qr.path} fill="black" />
  </svg>;
}
