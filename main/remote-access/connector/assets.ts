import type { ConnectorAsset } from "@main/types/remote-access/connector/connector.types";

// Official release asset SHA-256 digests; update the version and every digest together.
export const CONNECTOR_VERSION = "2026.11.0";
const ASSETS: Readonly<Record<string, ConnectorAsset>> = {
  "darwin-x64": { name: "cloudflared-darwin-amd64.tgz", sha256: "8a59d51120cebbe902f0a8d6e1b7a7fd4f9a5bb4dcb3e0f05872483e75e7db6b", archive: true },
  "darwin-arm64": { name: "cloudflared-darwin-arm64.tgz", sha256: "8c2f90277ef06a6080bb40b964d33f09f1188102f8798f2e344174b6cf41accf", archive: true },
  "linux-x64": { name: "cloudflared-linux-amd64", sha256: "51f7c68b57ed7269164075d7e789efce5b59355982f06392deeb037d982a51fd", archive: false },
  "linux-arm64": { name: "cloudflared-linux-arm64", sha256: "abe54a006acf9faf2d19ee9d953cb0d0804e92f59c5382a162e57b84d086f56f", archive: false },
  "win32-x64": { name: "cloudflared-windows-amd64.exe", sha256: "d5c1d82031da6253dcdcff64c944cd0fe063016edeb2e4fd088075fc9bd52d0a", archive: false },
};
export function connectorAsset(platform: NodeJS.Platform, arch: string): ConnectorAsset {
  const asset = ASSETS[`${platform}-${arch}`];
  if (!asset) throw new Error(`The remote connector is not available for ${platform}/${arch}.`);
  return asset;
}
