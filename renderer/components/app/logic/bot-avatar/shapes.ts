import type { BotAvatarShape } from "@shared/types/bots/bots.types";
import type { BotAvatarPoint, BotShapeGeometry, BotShapeSpec } from "@/components/app/types/botAvatar.types";

const TAU = Math.PI * 2;
const sample = (count: number, at: (t: number) => BotAvatarPoint): BotAvatarPoint[] => Array.from({ length: count }, (_, index) => at(index / count * TAU));
const polar = (count: number, radius: (t: number) => number): BotAvatarPoint[] => sample(count, (t) => [Math.cos(t) * radius(t), Math.sin(t) * radius(t)]);
const polygon = (sides: number, rotation: number, radii: readonly number[] = [1]): BotAvatarPoint[] =>
  Array.from({ length: sides * radii.length }, (_, index) => {
    const t = rotation + index / (sides * radii.length) * TAU;
    const radius = radii[index % radii.length];
    return [Math.cos(t) * radius, Math.sin(t) * radius];
  });
/** Corner cutting: every iteration rounds each corner, so no outline keeps a sharp point. */
const chaikin = (points: readonly BotAvatarPoint[], iterations: number): BotAvatarPoint[] => {
  let current = [...points];
  for (let step = 0; step < iterations; step += 1) {
    current = current.flatMap((a, index): BotAvatarPoint[] => {
      const b = current[(index + 1) % current.length];
      return [[0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]];
    });
  }
  return current;
};
const rotate = (points: readonly BotAvatarPoint[], angle: number): BotAvatarPoint[] =>
  points.map(([x, y]) => [x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle)]);
/** Superellipse with an optional egg taper (wider at the bottom). */
const superellipse = (exponent: number, scaleX: number, scaleY: number, taper = 0): BotAvatarPoint[] =>
  polar(96, (t) => Math.pow(Math.abs(Math.cos(t)) ** exponent + Math.abs(Math.sin(t)) ** exponent, -1 / exponent) * (1 + taper * Math.sin(t)))
    .map(([x, y]) => [x * scaleX, y * scaleY]);

const SHAPES: Readonly<Record<BotAvatarShape, BotShapeSpec>> = {
  circle: { points: () => superellipse(2, 1, 1) },
  squircle: { points: () => superellipse(4, 1, 1) },
  pill: { points: () => superellipse(5, 1.35, 0.78) },
  pebble: { points: () => superellipse(2.3, 1.15, 0.86) },
  egg: { points: () => superellipse(2, 0.88, 1.05, 0.1) },
  drop: { faceOffsetY: 5, points: () => chaikin(sample(96, (t) => [Math.sin(t) * Math.sin(t / 2) ** 1.2, -Math.cos(t)]), 2) },
  cloud: { faceOffsetY: 2, points: () => chaikin(polar(120, (t) => 0.84 + 0.16 * Math.abs(Math.cos(t * 3.5 + 0.45)) ** 0.6).map(([x, y]) => [x * 1.15, y * 0.92]), 2) },
  flower: { points: () => polar(120, (t) => 0.8 + 0.2 * Math.cos(5 * t - Math.PI / 2)) },
  clover: { points: () => chaikin(polar(120, (t) => 0.72 + 0.28 * Math.abs(Math.cos(2 * t + Math.PI / 4)) ** 0.7), 2) },
  sparkle: { faceScale: 0.85, points: () => chaikin(polygon(4, -Math.PI / 2, [1, 0.5]), 4) },
  star: { faceOffsetY: 3, faceScale: 0.85, points: () => chaikin(polygon(5, -Math.PI / 2, [1, 0.62]), 4) },
  heart: { faceOffsetY: -1, points: () => chaikin(sample(96, (t) => [Math.sin(t) ** 3, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16]), 1) },
  ghost: { faceOffsetY: -4, points: () => chaikin([
    ...Array.from({ length: 25 }, (_, index): BotAvatarPoint => { const t = Math.PI + index / 24 * Math.PI; return [Math.cos(t), Math.sin(t) * 0.95]; }),
    [1, 0.95], [0.66, 0.72], [0.33, 0.95], [0, 0.72], [-0.33, 0.95], [-0.66, 0.72], [-1, 0.95]], 3) },
  shield: { faceOffsetY: -3, points: () => chaikin([[-1, -0.95], [1, -0.95], [1, 0.15], [0, 1.1], [-1, 0.15]], 4) },
  leaf: { points: () => rotate(chaikin(sample(96, (t) => [Math.cos(t) * 1.15, Math.sin(t) * 0.7 * (1 - 0.55 * Math.cos(t) ** 2)]), 2), -0.5) },
  triangle: { faceOffsetY: 7, faceScale: 0.85, points: () => chaikin(polygon(3, -Math.PI / 2), 4) },
  pentagon: { faceOffsetY: 2, points: () => chaikin(polygon(5, -Math.PI / 2), 4) },
  hexagon: { points: () => chaikin(polygon(6, 0), 4) }
};

/** Fits an outline into the 100×100 avatar box so every shape reads at the same visual size. */
function normalize(points: readonly BotAvatarPoint[]): BotAvatarPoint[] {
  const xs = points.map(([x]) => x), ys = points.map(([, y]) => y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const scale = 68 / Math.max(maxX - minX, maxY - minY);
  return points.map(([x, y]) => [x * scale + 50 - (minX + maxX) / 2 * scale, y * scale + 51 - (minY + maxY) / 2 * scale]);
}

const cache = new Map<BotAvatarShape, BotShapeGeometry>();

/** Static body geometry: computed once per shape and never animated. */
export function botShapeGeometry(shape: BotAvatarShape): BotShapeGeometry {
  const cached = cache.get(shape);
  if (cached) return cached;
  const spec = SHAPES[shape];
  const path = `M${normalize(spec.points()).map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join("L")}Z`;
  const geometry = { path, faceOffsetY: spec.faceOffsetY ?? 0, faceScale: spec.faceScale ?? 1 };
  cache.set(shape, geometry);
  return geometry;
}
