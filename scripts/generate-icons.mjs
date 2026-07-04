import sharp from "sharp";
import { readFileSync } from "node:fs";
import path from "node:path";

const svg = readFileSync(path.join(import.meta.dirname, "icon-source.svg"));

const targets = [
  { file: "public/pwa-192x192.png", size: 192 },
  { file: "public/pwa-512x512.png", size: 512 },
  { file: "public/maskable-icon-512x512.png", size: 512 },
  { file: "public/apple-touch-icon.png", size: 180 },
];

for (const t of targets) {
  await sharp(svg, { density: 384 })
    .resize(t.size, t.size)
    .png()
    .toFile(path.join(import.meta.dirname, "..", t.file));
  console.log("wrote", t.file);
}
