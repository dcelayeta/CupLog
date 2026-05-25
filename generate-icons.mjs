import sharp from "sharp";
import { writeFileSync } from "fs";

const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="114" fill="#1C1C1E"/>
  <!-- Cup body -->
  <path d="M148 195 L196 350 L316 350 L364 195 Z" fill="#F2F2F7"/>
  <!-- Handle -->
  <path d="M316 238 Q400 238 400 290 Q400 345 316 345" stroke="#F2F2F7" stroke-width="24" fill="none" stroke-linecap="round"/>
  <!-- Saucer -->
  <ellipse cx="256" cy="360" rx="120" ry="19" fill="#F2F2F7" opacity="0.85"/>
  <!-- Steam left -->
  <path d="M214 168 Q224 138 214 108" stroke="#F2F2F7" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.6"/>
  <!-- Steam center -->
  <path d="M256 158 Q256 128 256 98" stroke="#F2F2F7" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.6"/>
  <!-- Steam right -->
  <path d="M298 168 Q288 138 298 108" stroke="#F2F2F7" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.6"/>
</svg>`);

await sharp(svg).resize(192, 192).png().toFile("public/icon-192.png");
await sharp(svg).resize(512, 512).png().toFile("public/icon-512.png");
console.log("✓ Generated public/icon-192.png and public/icon-512.png");
