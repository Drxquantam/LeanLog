// Rasterises the Lean Log mark into PNG app icons with no dependencies.
// Run: node scripts/make-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [10, 11, 13];
const ACCENT = [92, 200, 250];
const FG = [238, 239, 241];
// Strokes in a 64-unit grid (same as public/favicon.svg)
const STROKES = [
  { pts: [[20, 16], [20, 48], [44, 48]], w: 6, c: ACCENT },
  { pts: [[30, 38], [36, 30], [41, 34], [47, 25]], w: 4, c: FG },
];

function distSeg(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function inRoundRect(x, y, size, r) {
  const cx = Math.min(Math.max(x, r), size - r);
  const cy = Math.min(Math.max(y, r), size - r);
  return Math.hypot(x - cx, y - cy) <= r;
}

function render(size, { maskable = false, rounded = true } = {}) {
  const ss = 4;
  const px = new Uint8Array(size * size * 4);
  const scale = maskable ? 0.72 : 1; // keep the mark inside the maskable safe zone
  const off = (64 - 64 * scale) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const ux = ((x + (sx + 0.5) / ss) / size) * 64;
          const uy = ((y + (sy + 0.5) / ss) / size) * 64;
          const inside = maskable || !rounded || inRoundRect(ux, uy, 64, 14);
          if (!inside) continue;
          let col = BG;
          const gx = (ux - off) / scale, gy = (uy - off) / scale;
          for (const s of STROKES) {
            for (let i = 0; i < s.pts.length - 1; i++) {
              if (distSeg(gx, gy, s.pts[i], s.pts[i + 1]) <= s.w / 2) col = s.c;
            }
          }
          r += col[0]; g += col[1]; b += col[2]; a += 255;
        }
      }
      const n = ss * ss, i = (y * size + x) * 4;
      const cov = a / n;
      px[i] = cov ? Math.round((r / n) * 255 / cov) : 0;
      px[i + 1] = cov ? Math.round((g / n) * 255 / cov) : 0;
      px[i + 2] = cov ? Math.round((b / n) * 255 / cov) : 0;
      px[i + 3] = Math.round(cov);
    }
  }
  return encodePNG(size, px);
}

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(size, px) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    Buffer.from(px.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

writeFileSync('public/icon-192.png', render(192));
writeFileSync('public/icon-512.png', render(512));
writeFileSync('public/icon-maskable-512.png', render(512, { maskable: true }));
writeFileSync('public/apple-touch-icon.png', render(180, { rounded: false }));
console.log('icons written');
