import { SPORT_OPTIONS } from "./sports.js";

export const SPORT_DEFAULT_IMAGES = {
  Football: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1000&q=85",
  Basketball: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1000&q=85",
  Cricket: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1000&q=85",
  Badminton: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1000&q=85",
  Hockey: "https://images.unsplash.com/photo-1580748141549-71748dbe0f8b?auto=format&fit=crop&w=1000&q=85",
  Tennis: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=1000&q=85",
  Volleyball: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1000&q=85",
  Pickleball: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1000&q=85",
  Swimming: "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1000&q=85",
  "Table Tennis": "https://images.unsplash.com/photo-1611251135345-18c56206b863?auto=format&fit=crop&w=1000&q=85",
  Squash: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1000&q=85",
};

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function validateImageFile(file) {
  if (!file) {
    return { ok: false, error: "No file selected." };
  }
  const name = file.name || "";
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  const type = (file.type || "").toLowerCase();

  const validExt = ALLOWED_IMAGE_EXTENSIONS.includes(ext);
  const validType = ALLOWED_IMAGE_TYPES.includes(type) || !type;

  if (!validExt && !ALLOWED_IMAGE_TYPES.includes(type)) {
    return {
      ok: false,
      error: `"${name}" is not a supported image format. Please upload JPG, JPEG, PNG, or WEBP images.`,
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      ok: false,
      error: `"${name}" exceeds the 10MB file size limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller image.`,
    };
  }

  return { ok: true };
}

export function getTurfImages(turf) {
  const primarySport = turf?.sports?.[0] || "Football";
  const fallback = SPORT_DEFAULT_IMAGES[primarySport] || SPORT_DEFAULT_IMAGES.Football;

  if (!turf) {
    return { cover: fallback, gallery: [fallback], isDefault: true };
  }

  // Case 1: array in turf.images
  if (Array.isArray(turf.images) && turf.images.length > 0) {
    const valid = turf.images.filter((u) => typeof u === "string" && (u.startsWith("http://") || u.startsWith("https://")));
    if (valid.length > 0) {
      const cover = typeof turf.image === "string" && (turf.image.startsWith("http://") || turf.image.startsWith("https://"))
        ? turf.image
        : valid[0];
      const gallery = [cover, ...valid.filter((u) => u !== cover)];
      return { cover, gallery, isDefault: false };
    }
  }

  // Case 2: turf.image is JSON
  if (typeof turf.image === "string" && turf.image.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(turf.image);
      const list = Array.isArray(parsed.gallery)
        ? parsed.gallery
        : (Array.isArray(parsed.images) ? parsed.images : []);
      const valid = list.filter((u) => typeof u === "string" && (u.startsWith("http://") || u.startsWith("https://")));
      const cover = (typeof parsed.cover === "string" && (parsed.cover.startsWith("http://") || parsed.cover.startsWith("https://")))
        ? parsed.cover
        : (valid[0] || fallback);

      const gallery = valid.length > 0
        ? (valid.includes(cover) ? [cover, ...valid.filter((u) => u !== cover)] : [cover, ...valid])
        : [cover];

      return { cover, gallery, isDefault: !valid.length };
    } catch {}
  }

  // Case 3: turf.image is a direct URL
  if (typeof turf.image === "string" && (turf.image.startsWith("http://") || turf.image.startsWith("https://"))) {
    return { cover: turf.image, gallery: [turf.image], isDefault: false };
  }

  // Fallback
  return { cover: fallback, gallery: [fallback], isDefault: true };
}
