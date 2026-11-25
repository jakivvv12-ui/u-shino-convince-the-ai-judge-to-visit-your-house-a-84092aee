const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const W = 1024;
const H = 1024;
const px = new Uint8Array(W * H * 4);

function set(x, y, c) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
}
function blend(x, y, c, a) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  px[i] = Math.round(px[i] * (1 - a) + c[0] * a);
  px[i + 1] = Math.round(px[i + 1] * (1 - a) + c[1] * a);
  px[i + 2] = Math.round(px[i + 2] * (1 - a) + c[2] * a);
  px[i + 3] = 255;
}
function rect(x, y, w, h, c) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, c);
}
function circle(cx, cy, r, c) {
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++)
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) set(x, y, c);
}
function glow(cx, cy, r, c, a) {
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++) {
      const d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
      if (d <= r) blend(x, y, c, a * (1 - d / r));
    }
}
function tri(x1, y1, x2, y2, x3, y3, c) {
  const minX = Math.min(x1, x2, x3), maxX = Math.max(x1, x2, x3);
  const minY = Math.min(y1, y2, y3), maxY = Math.max(y1, y2, y3);
  const den = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
  for (let y = minY; y <= maxY; y++)
    for (let x = minX; x <= maxX; x++) {
      const a = ((y2 - y3) * (x - x3) + (x3 - x2) * (y - y3)) / den;
      const b = ((y3 - y1) * (x - x3) + (x1 - x3) * (y - y3)) / den;
      const d = 1 - a - b;
      if (a >= 0 && b >= 0 && d >= 0) set(x, y, c);
    }
}
function line(x1, y1, x2, y2, th, c) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
  for (let s = 0; s <= steps; s++) {
    const x = x1 + ((x2 - x1) * s) / steps;
    const y = y1 + ((y2 - y1) * s) / steps;
    circle(Math.round(x), Math.round(y), th, c);
  }
}
function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

// Sky gradient: deep dusk blue to warm peach at the horizon.
for (let y = 0; y < 560; y++) {
  const t = y / 560;
  const c = [lerp(22, 246, t), lerp(30, 166, t), lerp(74, 92, t)];
  rect(0, y, W, 1, c);
}
// Ground.
rect(0, 560, W, H - 560, [46, 74, 48]);
for (let y = 560; y < H; y++) {
  const t = (y - 560) / (H - 560);
  rect(0, y, W, 1, [lerp(56, 30, t), lerp(86, 52, t), lerp(54, 34, t)]);
}
// Stars (deterministic).
let seed = 1234567;
function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
for (let i = 0; i < 140; i++) {
  const x = Math.floor(rnd() * W), y = Math.floor(rnd() * 300);
  const r = rnd() > 0.85 ? 2 : 1;
  circle(x, y, r, [255, 244, 200]);
}
// Moon.
glow(862, 118, 90, [255, 240, 190], 0.35);
circle(862, 118, 46, [250, 238, 190]);
circle(846, 106, 40, [246, 230, 176]);

// Distant hills.
tri(0, 560, 260, 470, 560, 560, [38, 62, 52]);
tri(430, 560, 760, 460, 1024, 560, [34, 56, 48]);

// House walls.
rect(292, 330, 440, 230, [244, 226, 190]);
rect(292, 330, 440, 14, [226, 202, 158]);
// Roof.
tri(262, 336, 512, 196, 762, 336, [146, 58, 48]);
tri(292, 336, 512, 216, 732, 336, [168, 72, 56]);
// Chimney + smoke.
rect(648, 214, 44, 92, [120, 84, 70]);
circle(672, 196, 16, [232, 226, 218]);
circle(690, 172, 22, [238, 232, 224]);
circle(714, 144, 28, [244, 238, 230]);
// Windows (warm light).
function window_(x, y) {
  glow(x + 42, y + 42, 86, [255, 196, 92], 0.4);
  rect(x, y, 84, 84, [255, 205, 102]);
  rect(x, y, 84, 8, [110, 72, 44]);
  rect(x, y + 76, 84, 8, [110, 72, 44]);
  rect(x, y, 8, 84, [110, 72, 44]);
  rect(x + 76, y, 8, 84, [110, 72, 44]);
  rect(x + 38, y, 8, 84, [110, 72, 44]);
  rect(x, y + 38, 84, 8, [110, 72, 44]);
}
window_(336, 388);
window_(604, 388);
// Door.
rect(478, 430, 68, 130, [110, 64, 40]);
rect(486, 438, 52, 52, [255, 214, 120]);
circle(534, 500, 5, [255, 226, 150]);
// Porch light.
glow(560, 438, 52, [255, 214, 120], 0.55);
circle(560, 438, 9, [255, 232, 160]);
// Path from door to the letter panel.
tri(492, 560, 532, 560, 580, 640, [214, 190, 150]);
tri(492, 560, 444, 640, 580, 640, [206, 180, 140]);
// Fence posts.
for (let x = 120; x <= 240; x += 40) rect(x, 520, 10, 44, [150, 112, 76]);
rect(112, 534, 150, 8, [150, 112, 76]);
for (let x = 790; x <= 910; x += 40) rect(x, 520, 10, 44, [150, 112, 76]);
rect(782, 534, 150, 8, [150, 112, 76]);
// Tree.
rect(150, 430, 16, 120, [92, 62, 40]);
circle(158, 402, 58, [52, 96, 58]);
circle(122, 428, 40, [60, 104, 64]);
circle(196, 428, 40, [60, 104, 64]);

// Letter panel (parchment) with a soft shadow.
rect(62, 652, 900, 330, [30, 26, 22]);
rect(52, 642, 900, 330, [252, 244, 222]);
rect(52, 642, 900, 10, [214, 178, 120]);
rect(52, 962, 900, 10, [214, 178, 120]);
rect(52, 642, 10, 330, [214, 178, 120]);
rect(942, 642, 10, 330, [214, 178, 120]);

const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '01010', '00100', '00100', '00100', '01010', '10001'],
  Y: ['10001', '01010', '00100', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  ',': ['00000', '00000', '00000', '00000', '00100', '00100', '01000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '00110', '00110'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};
function drawText(text, cx, y, scale, c) {
  const adv = 5 * scale + scale + 2;
  const width = text.length * adv - (scale + 2);
  let x = Math.round(cx - width / 2);
  for (const ch of text) {
    const g = FONT[ch] || FONT[' '];
    for (let r = 0; r < 7; r++)
      for (let col = 0; col < 5; col++)
        if (g[r][col] === '1') rect(x + col * scale, y + r * scale, scale, scale, c);
    x += adv;
  }
}
const ink = [74, 48, 32];
drawText('DEAR JUDGE,', 512, 668, 5, ink);
drawText('THE KETTLE IS ON,', 512, 716, 5, ink);
drawText('THE PORCH LIGHT IS WARM,', 512, 764, 5, ink);
drawText('AND THERE IS A CHAIR', 512, 812, 5, ink);
drawText('WITH YOUR NAME ON IT.', 512, 860, 5, ink);
drawText('PLEASE COME IN.', 512, 908, 5, [146, 58, 48]);

// PNG encoder (CRC32 + zlib).
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const raw = Buffer.alloc(H * (1 + W * 4));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 4)] = 0;
  Buffer.from(px.buffer, y * W * 4, W * 4).copy(raw, y * (1 + W * 4) + 1);
}
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
if (png.length > 1048576) throw new Error('PNG exceeds 1MiB: ' + png.length);
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'entry.png'), png);
