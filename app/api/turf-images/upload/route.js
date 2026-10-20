import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";
import { normalizeUserRole } from "@/lib/auth/validation";
import { validateImageFile } from "@/lib/turf-images";

export async function POST(request) {
  try {
    const profile = await getProfile();
    const role = normalizeUserRole(profile?.role);

    if (!profile || (role !== "owner" && role !== "admin")) {
      return NextResponse.json(
        { error: "Unauthorized: only turf owners and administrators can upload turf photos." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    let files = formData.getAll("images");
    if (!files || files.length === 0) {
      const single = formData.get("image") || formData.get("file");
      if (single) files = [single];
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No image files were provided for upload." },
        { status: 400 }
      );
    }

    // Validate all files first before uploading
    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.ok) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
    }

    const admin = createAdminClient();
    const uploadedUrls = [];

    // Ensure bucket exists
    const { data: buckets } = await admin.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === "turf-images");
    if (!bucketExists) {
      await admin.storage.createBucket("turf-images", {
        public: true,
        fileSizeLimit: 10485760,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      });
    }

    for (const file of files) {
      const originalName = file.name || "photo.jpg";
      const extMatch = originalName.match(/\.([a-zA-Z0-9]+)$/);
      const ext = extMatch ? extMatch[1].toLowerCase() : "jpg";
      const cleanExt = ext === "jpeg" ? "jpg" : ext;
      const randomStr = Math.random().toString(36).substring(2, 9);
      const path = `${profile.id}/${Date.now()}-${randomStr}.${cleanExt}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const mimeType = file.type || (cleanExt === "png" ? "image/png" : cleanExt === "webp" ? "image/webp" : "image/jpeg");

      const { data: uploadData, error: uploadError } = await admin.storage
        .from("turf-images")
        .upload(path, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        console.error("Storage upload failed for file", originalName, uploadError);
        return NextResponse.json(
          { error: `Failed to upload "${originalName}": ${uploadError.message || "Storage error"}` },
          { status: 500 }
        );
      }

      const { data: publicData } = admin.storage
        .from("turf-images")
        .getPublicUrl(path);

      uploadedUrls.push(publicData.publicUrl);
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
    });
  } catch (error) {
    console.error("Turf image upload endpoint error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred while uploading photos." },
      { status: 500 }
    );
  }
}
