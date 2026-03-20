import { readFileSync } from 'fs';
import sharp from 'sharp';

const svg = readFileSync('public/worknote-app-icon.svg');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of sizes) {
  sharp(svg)
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-${size}x${size}.png`)
    .then(() => console.log(`✅ icon-${size}x${size}.png`));
}
