import test from "node:test";
import assert from "node:assert/strict";
import {
  validateImageFile,
  getTurfImages,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
  SPORT_DEFAULT_IMAGES,
} from "../lib/turf-images.js";

test("validateImageFile accepts valid image formats (JPG, JPEG, PNG, WEBP)", () => {
  const jpg = { name: "turf-pitch.jpg", type: "image/jpeg", size: 1024 * 1024 };
  const jpeg = { name: "turf-pitch.jpeg", type: "image/jpeg", size: 2 * 1024 * 1024 };
  const png = { name: "amenities.png", type: "image/png", size: 3 * 1024 * 1024 };
  const webp = { name: "floodlights.webp", type: "image/webp", size: 500 * 1024 };

  assert.equal(validateImageFile(jpg).ok, true);
  assert.equal(validateImageFile(jpeg).ok, true);
  assert.equal(validateImageFile(png).ok, true);
  assert.equal(validateImageFile(webp).ok, true);
});

test("validateImageFile rejects unsupported file formats", () => {
  const pdf = { name: "contract.pdf", type: "application/pdf", size: 1024 * 1024 };
  const gif = { name: "animation.gif", type: "image/gif", size: 1024 * 1024 };
  const exe = { name: "script.exe", type: "application/octet-stream", size: 1024 };

  const resPdf = validateImageFile(pdf);
  assert.equal(resPdf.ok, false);
  assert.match(resPdf.error, /not a supported image format/i);

  const resGif = validateImageFile(gif);
  assert.equal(resGif.ok, false);
  assert.match(resGif.error, /not a supported image format/i);

  const resExe = validateImageFile(exe);
  assert.equal(resExe.ok, false);
  assert.match(resExe.error, /not a supported image format/i);
});

test("validateImageFile rejects files exceeding the 10MB limit", () => {
  const oversize = {
    name: "huge-photo.jpg",
    type: "image/jpeg",
    size: 15 * 1024 * 1024, // 15MB
  };
  const res = validateImageFile(oversize);
  assert.equal(res.ok, false);
  assert.match(res.error, /exceeds the 10MB file size limit/i);
});

test("getTurfImages extracts JSON image object with cover and gallery", () => {
  const turf = {
    name: "Arena Nova",
    sports: ["Football"],
    image: JSON.stringify({
      cover: "https://storage.supabase.co/turfs/photo-1.jpg",
      gallery: [
        "https://storage.supabase.co/turfs/photo-1.jpg",
        "https://storage.supabase.co/turfs/photo-2.jpg",
        "https://storage.supabase.co/turfs/photo-3.jpg",
      ],
    }),
  };

  const images = getTurfImages(turf);
  assert.equal(images.cover, "https://storage.supabase.co/turfs/photo-1.jpg");
  assert.equal(images.gallery.length, 3);
  assert.equal(images.gallery[0], "https://storage.supabase.co/turfs/photo-1.jpg");
  assert.equal(images.isDefault, false);
});

test("getTurfImages supports custom selected cover image from gallery", () => {
  const turf = {
    name: "Arena Nova",
    sports: ["Cricket"],
    image: JSON.stringify({
      cover: "https://storage.supabase.co/turfs/photo-3.jpg",
      gallery: [
        "https://storage.supabase.co/turfs/photo-1.jpg",
        "https://storage.supabase.co/turfs/photo-2.jpg",
        "https://storage.supabase.co/turfs/photo-3.jpg",
      ],
    }),
  };

  const images = getTurfImages(turf);
  assert.equal(images.cover, "https://storage.supabase.co/turfs/photo-3.jpg");
  // Cover is prioritized first in gallery
  assert.equal(images.gallery[0], "https://storage.supabase.co/turfs/photo-3.jpg");
});

test("getTurfImages supports direct URL strings in turf.image", () => {
  const turf = {
    name: "Legacy Turf",
    sports: ["Tennis"],
    image: "https://example.com/tennis-court.jpg",
  };

  const images = getTurfImages(turf);
  assert.equal(images.cover, "https://example.com/tennis-court.jpg");
  assert.deepEqual(images.gallery, ["https://example.com/tennis-court.jpg"]);
  assert.equal(images.isDefault, false);
});

test("getTurfImages supports images array in turf.images", () => {
  const turf = {
    name: "Array Turf",
    sports: ["Badminton"],
    images: [
      "https://example.com/badminton-1.jpg",
      "https://example.com/badminton-2.jpg",
    ],
  };

  const images = getTurfImages(turf);
  assert.equal(images.cover, "https://example.com/badminton-1.jpg");
  assert.equal(images.gallery.length, 2);
  assert.equal(images.isDefault, false);
});

test("getTurfImages falls back gracefully to default sport image when no photos uploaded", () => {
  const turf = {
    name: "Basic Turf",
    sports: ["Basketball"],
    image: "football", // default placeholder from database
  };

  const images = getTurfImages(turf);
  assert.equal(images.cover, SPORT_DEFAULT_IMAGES.Basketball);
  assert.equal(images.isDefault, true);
});
