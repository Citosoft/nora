import assert from "node:assert/strict";
import test from "node:test";
import { BOT_AVATAR_SHAPES } from "@shared/bots/contracts";
import { botShapeGeometry } from "@/components/app/logic/bot-avatar/shapes";
import { botFaceStyle, resolveBotAvatar } from "@/components/app/logic/bot-avatar/resolve";
import { botFaceEyes } from "@/components/app/logic/bot-avatar/face";

test("every shape is a closed outline that fits the avatar box", () => {
  for (const shape of BOT_AVATAR_SHAPES) {
    const { path } = botShapeGeometry(shape);
    assert.match(path, /^M[\d.,L]+Z$/, shape);
    const numbers = path.slice(1, -1).split(/[L,]/).map(Number);
    assert.ok(numbers.every((value) => value >= 15 && value <= 86), shape);
    assert.equal(botShapeGeometry(shape), botShapeGeometry(shape));
  }
});

test("a seed always resolves to the same avatar, and pinning one part leaves the others", () => {
  const seeded = resolveBotAvatar({ seed: 123 });
  assert.deepEqual(resolveBotAvatar({ seed: 123 }), seeded);
  const pinned = resolveBotAvatar({ seed: 123, shape: seeded.shape === "heart" ? "ghost" : "heart" });
  assert.equal(pinned.palette, seeded.palette);
  assert.equal(pinned.eyes, seeded.eyes);
  assert.notEqual(pinned.shape, seeded.shape);
  const variety = new Set(Array.from({ length: 200 }, (_, seed) => resolveBotAvatar({ seed }).shape));
  assert.ok(variety.size > BOT_AVATAR_SHAPES.length / 2);
  assert.deepEqual(botFaceStyle(seeded), botFaceStyle(resolveBotAvatar({ seed: 123 })));
});

test("active states keep open eyes while failed and settled draw lines", () => {
  const style = { eyes: "dot" as const, gap: 11 };
  for (const state of ["idle", "thinking", "speaking", "waiting"] as const) {
    const eyes = botFaceEyes(style, state);
    assert.equal(eyes.kind, "open", state);
    assert.deepEqual(eyes.kind === "open" && eyes.eyes.map((eye) => eye.kind === "circle" && eye.cx), [39, 61]);
  }
  const failed = botFaceEyes(style, "failed"), settled = botFaceEyes(style, "settled");
  assert.ok(failed.kind === "line" && failed.paths.every((path) => path.endsWith("h10")));
  assert.ok(settled.kind === "line" && settled.paths.every((path) => path.includes("q6 5 12 0")));
});

test("each eye style draws its own open shape, centred on the eye position", () => {
  const centre = (eyes: ReturnType<typeof botFaceEyes>): number[] => eyes.kind === "open"
    ? eyes.eyes.map((eye) => eye.kind === "circle" ? eye.cx : eye.x + eye.width / 2) : [];
  const oval = botFaceEyes({ eyes: "oval", gap: 10 }, "idle"), pupil = botFaceEyes({ eyes: "pupil", gap: 10 }, "idle");
  assert.ok(oval.kind === "open" && oval.eyes[0].kind === "rect" && oval.eyes[0].height > oval.eyes[0].width);
  assert.ok(pupil.kind === "open" && pupil.eyes[0].kind === "rect" && pupil.eyes[0].width > pupil.eyes[0].height);
  assert.deepEqual(centre(oval), [40, 60]);
  assert.deepEqual(centre(pupil), [40, 60]);
  const style = botFaceStyle(resolveBotAvatar({ seed: 7 }));
  assert.ok(style.gap >= 10 && style.gap <= 13 && style.blinkDelaySeconds >= 0 && style.blinkDelaySeconds < 4);
});
