// Renders the mobile app's icons and splash art from the shared mark geometry used by the desktop app.
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { noraGlyphSvg, noraMarkSvg, SMALL_DIAGONAL_OPACITY } from "../../../scripts/noraMark.mjs";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** iOS and maskable web icons must be opaque, full-bleed squares; the platform applies its own mask. */
const fullBleedIcon = noraMarkSvg({ radius: 0 });
const smallFullBleedIcon = noraMarkSvg({ radius: 0, panel: false, diagonalOpacity: SMALL_DIAGONAL_OPACITY });

const opaqueIcons = [
  { file: "assets/icon-ios.png", svg: fullBleedIcon, size: 1024 },
  { file: "assets/favicon.png", svg: smallFullBleedIcon, size: 48 },
  { file: "public/icons/apple-touch-icon.png", svg: fullBleedIcon, size: 180 },
  { file: "public/icons/icon-192.png", svg: fullBleedIcon, size: 192 },
  { file: "public/icons/icon-512.png", svg: fullBleedIcon, size: 512 }
];

/** Splash art is the bare glyph on transparency, in the splash screen's ink for each theme. */
const splashGlyphs = [
  { file: "assets/splash-icon.png", color: "#0D0D0D" },
  { file: "assets/splash-icon-dark.png", color: "#FFFFFF" }
];

for (const { file, svg, size } of opaqueIcons) {
  await sharp(Buffer.from(svg)).resize(size, size).flatten().removeAlpha().png().toFile(path.join(appDir, file));
}
for (const { file, color } of splashGlyphs) {
  await sharp(Buffer.from(noraGlyphSvg({ color }))).png().toFile(path.join(appDir, file));
}
