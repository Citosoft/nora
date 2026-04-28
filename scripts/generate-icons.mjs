import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const rendererDir = path.resolve("renderer");
const svgPath = path.join(rendererDir, "icon.svg");
const pngPath = path.join(rendererDir, "icon.png");
const png256Path = path.join(rendererDir, "icon-256.png");
const icoPath = path.join(rendererDir, "icon.ico");
const icnsPath = path.join(rendererDir, "icon.icns");

const source = sharp(svgPath);

const pngSizes = [16, 32, 48, 64, 128, 256, 512, 1024];

function createIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const directory = Buffer.alloc(count * 16);
  let offset = header.length + directory.length;

  pngBuffers.forEach(({ size, data }, index) => {
    const entryOffset = index * 16;
    directory.writeUInt8(size >= 256 ? 0 : size, entryOffset);
    directory.writeUInt8(size >= 256 ? 0 : size, entryOffset + 1);
    directory.writeUInt8(0, entryOffset + 2);
    directory.writeUInt8(0, entryOffset + 3);
    directory.writeUInt16LE(1, entryOffset + 4);
    directory.writeUInt16LE(32, entryOffset + 6);
    directory.writeUInt32LE(data.length, entryOffset + 8);
    directory.writeUInt32LE(offset, entryOffset + 12);
    offset += data.length;
  });

  return Buffer.concat([header, directory, ...pngBuffers.map(({ data }) => data)]);
}

function createIcns(icnsEntries) {
  const chunks = icnsEntries.map(({ type, data }) => {
    const header = Buffer.alloc(8);
    header.write(type, 0, 4, "ascii");
    header.writeUInt32BE(data.length + 8, 4);
    return Buffer.concat([header, data]);
  });

  const totalLength = 8 + chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const fileHeader = Buffer.alloc(8);
  fileHeader.write("icns", 0, 4, "ascii");
  fileHeader.writeUInt32BE(totalLength, 4);
  return Buffer.concat([fileHeader, ...chunks]);
}

await mkdir(rendererDir, { recursive: true });

const renderedPngs = await Promise.all(
  pngSizes.map(async (size) => ({
    size,
    data: await source.clone().resize(size, size).png().toBuffer()
  }))
);

await writeFile(pngPath, renderedPngs.find((entry) => entry.size === 1024).data);
await writeFile(png256Path, renderedPngs.find((entry) => entry.size === 256).data);
await writeFile(
  icoPath,
  createIco(renderedPngs.filter((entry) => [16, 32, 48, 64, 128, 256].includes(entry.size)))
);

const icnsTypeBySize = new Map([
  [16, "icp4"],
  [32, "icp5"],
  [64, "icp6"],
  [128, "ic07"],
  [256, "ic08"],
  [512, "ic09"],
  [1024, "ic10"]
]);

await writeFile(
  icnsPath,
  createIcns(
    renderedPngs
      .filter((entry) => icnsTypeBySize.has(entry.size))
      .map((entry) => ({
        type: icnsTypeBySize.get(entry.size),
        data: entry.data
      }))
  )
);
