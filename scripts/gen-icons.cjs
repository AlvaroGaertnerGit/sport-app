/**
 * Generates Sport Coach's PWA/app icons from the SCOPE character reference
 * (docs/scope-logo/image.png) -- the character is the source of truth per
 * the brand brief; this crops its top hero composition (character + red
 * orbital ring, on the project's own near-black dark-mode background) and
 * derives every shipped size from that one master via sharp. Re-run with
 * `node scripts/gen-icons.cjs` from the repo root if the crop or reference
 * ever changes -- never hand-edit the PNGs.
 *
 * Outputs:
 *   src/app/icon.png             -- Next's file-convention favicon/icon (auto <link>)
 *   src/app/apple-icon.png       -- Next's file-convention apple-touch-icon (auto <link>)
 *   src/app/favicon.ico          -- multi-res (16/32/48) browser-tab favicon
 *   public/icon-192.png          -- manifest.ts "any" purpose icon
 *   public/icon-512.png          -- manifest.ts "any" purpose icon
 *   public/icon-maskable-512.png -- manifest.ts "maskable" icon (mark shrunk to the ~66% safe zone so Android's adaptive-icon circle mask never clips it)
 */
const path = require("node:path");
const fs = require("node:fs/promises");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const REFERENCE = path.join(ROOT, "docs/scope-logo/image.png");

// Tight square crop of the reference's top hero icon (character + ring on
// its dark rounded card) -- found by bounding-box detection against the
// pure-black backdrop surrounding it in the source sheet.
const MASTER_CROP = { left: 298, top: 30, width: 656, height: 656 };
const MASTER_SIZE = 1024;

// At true favicon sizes (16/32px) the full composition's ring tails and the
// low-contrast dark visor against the dark card both wash out. This crops
// in further on the head (bounding box of the cream head color, +padding)
// and boosts contrast, used only for favicon.ico -- the 192/512/apple/
// maskable sizes have enough pixels to read the full composition cleanly.
const FAVICON_CROP = { left: 133, top: 157, width: 708, height: 708 };

async function buildMaster() {
  return sharp(REFERENCE).extract(MASTER_CROP).resize(MASTER_SIZE, MASTER_SIZE, { kernel: "lanczos3" }).png().toBuffer();
}

async function buildFaviconMaster(masterBuffer) {
  return sharp(masterBuffer)
    .extract(FAVICON_CROP)
    .resize(512, 512, { kernel: "lanczos3" })
    .linear(1.18, -18) // contrast boost so the visor/eyes survive downsampling to 16px
    .png()
    .toBuffer();
}

async function buildMaskable(masterBuffer) {
  const content = Math.round(MASTER_SIZE * 0.66);
  const shrunk = await sharp(masterBuffer).resize(content, content, { kernel: "lanczos3" }).toBuffer();
  return sharp({
    create: { width: MASTER_SIZE, height: MASTER_SIZE, channels: 3, background: "#000000" },
  })
    .composite([{ input: shrunk, gravity: "center" }])
    .png()
    .toBuffer();
}

// Minimal ICO packer: PNG-compressed entries are valid in the ICO format
// since Vista, so no BMP re-encoding is needed.
function toIco(entries /* [{data: Buffer, size: number}] */) {
  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  const imageChunks = [];
  let offset = 6 + count * 16;

  for (const { data, size } of entries) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    dirEntries.push(entry);
    imageChunks.push(data);
    offset += data.length;
  }

  return Buffer.concat([header, ...dirEntries, ...imageChunks]);
}

async function main() {
  const master = await buildMaster();
  const maskable = await buildMaskable(master);
  const faviconMaster = await buildFaviconMaster(master);
  const resize = (size) => sharp(master).resize(size, size, { kernel: "lanczos3" }).png().toBuffer();
  const resizeFavicon = (size) =>
    sharp(faviconMaster)
      .resize(size, size, { kernel: "lanczos3" })
      .sharpen({ sigma: size <= 16 ? 0.6 : 0.4 })
      .ensureAlpha() // Next's ICO decoder rejects RGB-only PNG frames -- requires RGBA
      .png()
      .toBuffer();

  const [icon192, icon512, apple180, favicon16, favicon32, favicon48, maskable512] = await Promise.all([
    resize(192),
    resize(512),
    resize(180),
    resizeFavicon(16),
    resizeFavicon(32),
    resizeFavicon(48),
    sharp(maskable).resize(512, 512, { kernel: "lanczos3" }).png().toBuffer(),
  ]);

  await Promise.all([
    sharp(icon192).toFile(path.join(ROOT, "src/app/icon.png")),
    sharp(apple180).toFile(path.join(ROOT, "src/app/apple-icon.png")),
    sharp(icon192).toFile(path.join(ROOT, "public/icon-192.png")),
    sharp(icon512).toFile(path.join(ROOT, "public/icon-512.png")),
    sharp(maskable512).toFile(path.join(ROOT, "public/icon-maskable-512.png")),
  ]);

  const ico = toIco([
    { data: favicon16, size: 16 },
    { data: favicon32, size: 32 },
    { data: favicon48, size: 48 },
  ]);
  await fs.writeFile(path.join(ROOT, "src/app/favicon.ico"), ico);

  console.log("Icon set generated from docs/scope-logo/image.png.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
