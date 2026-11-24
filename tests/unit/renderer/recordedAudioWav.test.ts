import { encodePcm16Wav } from "@/components/app/logic/recordedAudioWav";
import assert from "node:assert/strict";
import test from "node:test";

test("encodePcm16Wav writes a mono 16-bit RIFF header and clamped samples", () => {
  const wav = encodePcm16Wav(new Float32Array([0, 1, -1, 2]), 16000);
  const view = new DataView(wav.buffer);
  const text = (offset: number, length: number) => String.fromCharCode(...wav.slice(offset, offset + length));

  assert.equal(wav.length, 44 + 8);
  assert.equal(text(0, 4), "RIFF");
  assert.equal(text(8, 4), "WAVE");
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint32(24, true), 16000);
  assert.equal(view.getUint16(34, true), 16);
  assert.equal(view.getUint32(40, true), 8);
  assert.deepEqual([0, 1, 2, 3].map((index) => view.getInt16(44 + index * 2, true)), [0, 0x7fff, -0x8000, 0x7fff]);
});
