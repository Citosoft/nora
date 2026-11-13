import assert from "node:assert/strict";
import test from "node:test";
import { BOT_AVATAR_SHAPES } from "@shared/bots/contracts";
import { botShapeGeometry } from "@/components/app/logic/bot-avatar/shapes";
import { botEyeStyle, resolveBotAvatar } from "@/components/app/logic/bot-avatar/resolve";
import { botFaceFrame } from "@/components/app/logic/bot-avatar/face";

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
  assert.deepEqual(botEyeStyle(seeded), botEyeStyle(resolveBotAvatar({ seed: 123 })));
});

test("states are expressed only through the eyes", () => {
  const style = { eyes: "dot" as const, gap: 9, blinkPhase: 1.5, glanceDirection: 1 as const };
  const idle = botFaceFrame(style, "idle", 0);
  assert.equal(idle.eyes[0].kind, "solid");
  assert.equal(idle.sleep, null);
  const blink = botFaceFrame(style, "idle", 2.55);
  assert.ok(blink.eyes[0].kind === "solid" && blink.eyes[0].ry < 1);
  assert.deepEqual(botFaceFrame(style, "failed", 3).eyes.map((eye) => eye.kind), ["lower-half", "lower-half"]);
  const settled = botFaceFrame(style, "settled", 3);
  assert.deepEqual(settled.eyes.map((eye) => eye.kind), ["closed", "closed"]);
  assert.ok(settled.sleep);
  const waiting = botFaceFrame(style, "waiting", 1);
  assert.ok(waiting.eyes[0].kind === "solid" && idle.eyes[0].kind === "solid" && waiting.eyes[0].rx > idle.eyes[0].rx);
  const pupil = botFaceFrame({ ...style, eyes: "pupil" }, "thinking", 0.5);
  assert.ok(pupil.eyes[0].kind === "pupil" && pupil.eyes[0].pupil && pupil.eyes[0].pupil.cy < pupil.eyes[0].cy);
});
