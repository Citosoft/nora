import { Cloud, Laptop, Smartphone, Waypoints } from "lucide-react";
import type { CSSProperties } from "react";

const packet = (path: string, delay: number): CSSProperties => ({ offsetPath: `path("${path}")`, animationDelay: `${delay}ms` });
const TO_CLOUD = "M176 200 H260";
const FROM_CLOUD = "M260 200 H176";
const TO_COMPUTER = "M420 200 H504";
const FROM_COMPUTER = "M504 200 H420";

/** How Nora Relay links the phone app to this computer; numbered badges match the steps listed beneath it. */
export function NoraRelayDiagram() {
  return <svg viewBox="0 0 680 250" role="img" aria-labelledby="nora-relay-diagram-title" className="nora-relay-diagram h-auto w-full">
    <title id="nora-relay-diagram-title">Your phone reaches this computer through Cloudflare and an outbound tunnel; the Nora Relay directory tells the phone which computers are yours.</title>
    <path d="M96 168 V48 H240" className="nora-relay-link-dashed" />
    <path d="M584 168 V48 H440" className="nora-relay-link-dashed" />
    <text x="106" y="116" className="nora-relay-label">Finds your computers</text>
    <text x="574" y="116" textAnchor="end" className="nora-relay-label">Registers this computer</text>
    <line x1="176" y1="200" x2="260" y2="200" className="nora-relay-link" />
    <text x="218" y="188" textAnchor="middle" className="nora-relay-label">HTTPS</text>
    <line x1="420" y1="194" x2="504" y2="194" className="nora-relay-tunnel" />
    <line x1="420" y1="206" x2="504" y2="206" className="nora-relay-tunnel" />
    <text x="462" y="182" textAnchor="middle" className="nora-relay-label">Tunnel</text>
    <circle r="3" className="nora-relay-packet" style={packet(TO_CLOUD, 0)} />
    <circle r="3" className="nora-relay-packet" style={packet(TO_COMPUTER, 700)} />
    <circle r="3" className="nora-relay-packet nora-relay-packet-reply" style={packet(FROM_COMPUTER, 1400)} />
    <circle r="3" className="nora-relay-packet nora-relay-packet-reply" style={packet(FROM_CLOUD, 2100)} />
    <g>
      <rect x="240" y="20" width="200" height="56" rx="12" className="nora-relay-node nora-relay-node-accent" />
      <Waypoints x="256" y="38" width="20" height="20" className="text-primary" />
      <text x="286" y="44" className="nora-relay-title">Nora Relay</text>
      <text x="286" y="62" className="nora-relay-label">Directory of your computers</text>
    </g>
    {([
      { x: 16, icon: Smartphone, title: "Your phone", detail: "Nora app" },
      { x: 260, icon: Cloud, title: "Cloudflare", detail: "Carries the traffic" },
      { x: 504, icon: Laptop, title: "This computer", detail: "Nora + connector" }
    ] as const).map(({ x, icon: Icon, title, detail }) => <g key={title}>
      <rect x={x} y="168" width="160" height="64" rx="12" className="nora-relay-node" />
      <Icon x={x + 14} y="190" width="20" height="20" className="text-muted-foreground" />
      <text x={x + 44} y="196" className="nora-relay-title">{title}</text>
      <text x={x + 44} y="214" className="nora-relay-label">{detail}</text>
    </g>)}
    {([[584, 140, 1], [462, 228, 2], [96, 140, 3], [218, 228, 4]] as const).map(([cx, cy, step]) => <g key={step}>
      <circle cx={cx} cy={cy} r="10" className="nora-relay-badge" />
      <text x={cx} y={cy + 4} textAnchor="middle" className="nora-relay-badge-text">{step}</text>
    </g>)}
  </svg>;
}
