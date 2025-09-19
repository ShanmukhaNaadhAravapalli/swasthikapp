// app/api/attachments/upload/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Server-side Supabase admin client (requires SUPABASE_SERVICE_ROLE_KEY in env)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase server env keys. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/**
 * Accepts multipart/form-data with one or more files under field name "files".
 * Uploads each to the 'attachments' bucket and returns { urls: [ ... ] }.
 *
 * IMPORTANT:
 * - This route only uploads files to Supabase Storage and returns public URLs.
 * - It does NOT insert metadata into any Supabase Postgres table (avoids RLS).
 * - Your existing app/api/posts/create route should insert attachment URLs into Neon.
 */
export async function POST(req: Request) {
  try {
    // Parse formData
    const formData = await req.formData();
    const entries = Array.from(formData.entries()).filter(([, v]) => v instanceof File);

    if (!entries.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploadedUrls: string[] = [];
    for (const [fieldName, fileLike] of entries) {
      const file = fileLike as File;
      // Build a safe path: attachments/<timestamp>-<rand>-<filename>
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2,8)}-${file.name.replace(/\s+/g,'_')}`;
      const path = `attachments/${safeName}`;

      // Convert File to Buffer (Node)
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload using admin client
      const { data, error } = await supabaseAdmin.storage
        .from("attachments")
        .upload(path, buffer, {
          contentType: file.type || "application/octet-stream",
          cacheControl: "3600",
          upsert: false,
        });

      if (error || !data) {
        console.error("Supabase upload error", { file: file.name, error });
        return NextResponse.json({ error: error?.message ?? "upload failed" }, { status: 500 });
      }

      // Get public URL (works if bucket is public)
      const { data: publicUrlData } = supabaseAdmin.storage.from("attachments").getPublicUrl(data.path);
      if (!publicUrlData || !publicUrlData.publicUrl) {
        console.error("Supabase getPublicUrl error: No public URL returned");
        return NextResponse.json({ error: "Failed to get public url" }, { status: 500 });
      }

      uploadedUrls.push(publicUrlData.publicUrl);
    }

    return NextResponse.json({ urls: uploadedUrls });
  } catch (err: any) {
    console.error("[/api/attachments/upload] error:", err);
    // If the incoming request wasn't form-data in a way Node could parse, return readable error
    const msg = err?.message ?? String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
