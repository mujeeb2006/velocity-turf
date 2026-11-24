import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

// CRC32 implementation for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPngChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4);
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function createPng(width, height, pixelFn) {
  // RGBA pixels
  const rowBytes = 1 + width * 4; // 1 filter byte + RGBA
  const rawData = Buffer.alloc(rowBytes * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = pixelFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = createPngChunk("IHDR", ihdr);
  const idatChunk = createPngChunk("IDAT", deflated);
  const iendChunk = createPngChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

// Role configurations
const ROLES = {
  admin: {
    name: "Velocity Turf Admin",
    badge: "ADMIN",
    bg1: [17, 28, 46],      // #111C2E deep navy
    bg2: [23, 43, 77],      // #172B4D royal navy
    accent: [245, 158, 11], // #F59E0B gold
    dot: [200, 245, 66],    // #C8F542 lime
    svgBg: "#111C2E",
    svgStripe1: "#1A2E4C",
    svgStripe2: "#172B4D",
    svgAccent: "#F59E0B",
    svgBadgeBg: "#F59E0B",
    svgBadgeText: "#0F172A",
  },
  owner: {
    name: "Velocity Turf Owner",
    badge: "OWNER",
    bg1: [6, 78, 59],       // #064E3B deep emerald
    bg2: [14, 112, 80],     // #0E7050 forest green
    accent: [200, 245, 66], // #C8F542 lime
    dot: [200, 245, 66],    // #C8F542 lime
    svgBg: "#064E3B",
    svgStripe1: "#0B6647",
    svgStripe2: "#0E7050",
    svgAccent: "#C8F542",
    svgBadgeBg: "#C8F542",
    svgBadgeText: "#064E3B",
  },
  player: {
    name: "Velocity Turf Player",
    badge: "PLAYER",
    bg1: [10, 25, 47],      // #0A192F midnight blue
    bg2: [23, 105, 232],    // #1769E8 electric blue
    accent: [200, 245, 66], // #C8F542 lime
    dot: [200, 245, 66],    // #C8F542 lime
    svgBg: "#0A192F",
    svgStripe1: "#14489A",
    svgStripe2: "#1769E8",
    svgAccent: "#C8F542",
    svgBadgeBg: "#1769E8",
    svgBadgeText: "#FFFFFF",
  },
};

function renderSvg(roleKey) {
  const conf = ROLES[roleKey];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <clipPath id="vt-clip-${roleKey}">
      <rect x="0" y="0" width="512" height="512" rx="120" />
    </clipPath>
    <linearGradient id="vt-bg-${roleKey}" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${conf.svgBg}" />
      <stop offset="100%" stop-color="${conf.svgStripe2}" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="120" fill="url(#vt-bg-${roleKey})" />
  <g clip-path="url(#vt-clip-${roleKey})">
    <!-- Sport turf background stripes -->
    <rect x="0" y="0" width="128" height="512" fill="${conf.svgStripe1}" opacity="0.35" />
    <rect x="128" y="0" width="128" height="512" fill="${conf.svgStripe2}" opacity="0.2" />
    <rect x="256" y="0" width="128" height="512" fill="${conf.svgStripe1}" opacity="0.35" />
    <rect x="384" y="0" width="128" height="512" fill="${conf.svgStripe2}" opacity="0.2" />

    <!-- Velocity chevron V -->
    <path d="M100 130h90l66 160 66-160h90l-114 260h-84L100 130Z" fill="#FFFFFF" />

    <!-- Speed streaks -->
    <path d="M140 100h110M170 120h80" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round" opacity="0.7" />

    <!-- Glowing accent sports ball -->
    <circle cx="380" cy="100" r="32" fill="${conf.svgAccent}" />
    <circle cx="380" cy="100" r="10" fill="${conf.svgBg}" />

    <!-- Role pill badge -->
    <rect x="126" y="416" width="260" height="58" rx="29" fill="${conf.svgBadgeBg}" />
    <text x="256" y="454" font-family="'Manrope', sans-serif" font-size="26" font-weight="900" fill="${conf.svgBadgeText}" text-anchor="middle" letter-spacing="3">${conf.badge}</text>
  </g>
  <rect x="2" y="2" width="508" height="508" rx="118" stroke="${conf.svgAccent}" stroke-opacity="0.4" stroke-width="4" />
</svg>`;
}

function makePixelShader(roleKey, maskable = false) {
  const conf = ROLES[roleKey];
  return (x, y, w, h) => {
    const nx = x / w;
    const ny = y / h;

    // Background gradient
    const t = (nx + ny) * 0.5;
    let r = Math.round(conf.bg1[0] * (1 - t) + conf.bg2[0] * t);
    let g = Math.round(conf.bg1[1] * (1 - t) + conf.bg2[1] * t);
    let b = Math.round(conf.bg1[2] * (1 - t) + conf.bg2[2] * t);
    let a = 255;

    // Corner rounding for non-maskable
    if (!maskable) {
      const radius = w * 0.22;
      const dx = Math.min(x, w - 1 - x);
      const dy = Math.min(y, h - 1 - y);
      if (dx < radius && dy < radius) {
        const dist = Math.hypot(radius - dx, radius - dy);
        if (dist > radius) {
          a = 0;
          return [0, 0, 0, 0];
        } else if (dist > radius - 1.5) {
          a = Math.round(255 * (radius - dist) / 1.5);
        }
      }
    }

    // Vertical stripe effect
    const stripe = Math.floor(nx * 4);
    if (stripe % 2 === 0) {
      r = Math.min(255, r + 15);
      g = Math.min(255, g + 15);
      b = Math.min(255, b + 15);
    }

    // Velocity "V" chevron rendering (approximate geometry)
    // Center is (0.5, 0.45)
    const cx = (nx - 0.5) * 2; // -1 to 1
    const cy = (ny - 0.46) * 2; // -1 to 1

    // Left leg: from (-0.55, -0.45) down to (0, 0.4)
    // Right leg: from (0.55, -0.45) down to (0, 0.4)
    const legWidth = 0.22;
    const legLeftDist = Math.abs((cy - (-0.45)) * (0 - (-0.55)) / (0.4 - (-0.45)) + (-0.55) - cx);
    const legRightDist = Math.abs((cy - (-0.45)) * (0 - 0.55) / (0.4 - (-0.45)) + 0.55 - cx);

    if (cy >= -0.48 && cy <= 0.42) {
      if (legLeftDist < legWidth * 0.6 || legRightDist < legWidth * 0.6) {
        r = 255;
        g = 255;
        b = 255;
      }
    }

    // Role Accent Ball at top right (nx: 0.76, ny: 0.22, r: 0.07)
    const ballDist = Math.hypot(nx - 0.76, ny - 0.22);
    if (ballDist < 0.065) {
      if (ballDist < 0.02) {
        r = conf.bg1[0];
        g = conf.bg1[1];
        b = conf.bg1[2];
      } else {
        r = conf.accent[0];
        g = conf.accent[1];
        b = conf.accent[2];
      }
    }

    // Role badge bar at the bottom: ny between 0.80 and 0.90, nx between 0.25 and 0.75
    if (ny >= 0.81 && ny <= 0.91 && nx >= 0.25 && nx <= 0.75) {
      r = conf.accent[0];
      g = conf.accent[1];
      b = conf.accent[2];
    }

    return [r, g, b, a];
  };
}

const ROOT_DIR = process.cwd();

for (const [roleKey, conf] of Object.entries(ROLES)) {
  const dir = path.join(ROOT_DIR, "public", "icons", roleKey);
  fs.mkdirSync(dir, { recursive: true });

  // 1. SVG Icon
  const svg = renderSvg(roleKey);
  fs.writeFileSync(path.join(dir, "icon.svg"), svg, "utf-8");

  // 2. 192x192 PNG
  const png192 = createPng(192, 192, makePixelShader(roleKey, false));
  fs.writeFileSync(path.join(dir, "icon-192x192.png"), png192);

  // 3. 192x192 Maskable PNG
  const png192m = createPng(192, 192, makePixelShader(roleKey, true));
  fs.writeFileSync(path.join(dir, "icon-192x192-maskable.png"), png192m);

  // 4. 512x512 PNG
  const png512 = createPng(512, 512, makePixelShader(roleKey, false));
  fs.writeFileSync(path.join(dir, "icon-512x512.png"), png512);

  // 5. 512x512 Maskable PNG
  const png512m = createPng(512, 512, makePixelShader(roleKey, true));
  fs.writeFileSync(path.join(dir, "icon-512x512-maskable.png"), png512m);

  // 6. Apple touch icon (180x180)
  const appleTouch = createPng(180, 180, makePixelShader(roleKey, true));
  fs.writeFileSync(path.join(dir, "apple-touch-icon.png"), appleTouch);

  console.log(`Generated all icons for: ${conf.name} in ${dir}`);
}
