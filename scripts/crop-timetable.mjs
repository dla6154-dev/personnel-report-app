import sharp from "sharp";

const [, , src, out, left, top, width, height, scale] = process.argv;

const img = sharp(src);
const meta = await img.metadata();
if (!left) {
  console.log(JSON.stringify(meta));
} else {
  await img
    .extract({
      left: Number(left),
      top: Number(top),
      width: Number(width),
      height: Number(height),
    })
    .resize({ width: Number(width) * Number(scale || 3) })
    .toFile(out);
  console.log("wrote", out);
}
