import { encodePcm16Wav } from "@/components/app/logic/convertRecordedAudioBlobToWav";
import assert from "node:assert/strict";
import test from "node:test";

test("encodePcm16Wav writes a valid mono PCM WAV header", () => {
  const samples = new Float32Array([0, 0.5, -0.5, 1, -1]);
  const wav = encodePcm16Wav(samples, 16_000);

  assert.equal(String.fromCharCode(...wav.slice(0, 4)), "RIFF");
  assert.equal(String.fromCharCode(...wav.slice(8, 12)), "WAVE");
  assert.equal(String.fromCharCode(...wav.slice(12, 16)), "fmt ");
  assert.equal(wav.length, 44 + samples.length * 2);
});
