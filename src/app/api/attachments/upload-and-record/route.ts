// app/api/attachments/upload-and-record/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pool } from "@/lib/neon";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE env keys.");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const postId = String(formData.get("postId") || "");

    if (!postId) {
      return NextResponse.json({ error: "postId required" }, { status: 400 });
    }

    const fileEntries = Array.from(formData.entries()).filter(([, v]) => v instanceof File);
    if (!fileEntries.length) {
      return NextResponse.json({ error: "no files provided" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const inserted: any[] = [];

      for (const [, fileLike] of fileEntries) {
        const file = fileLike as File;
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2,8)}-${file.name.replace(/\s+/g,'_')}`;
        const path = `attachments/${safeName}`;

        // read buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // upload bytes
        const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
          .from("attachments")
          .upload(path, buffer, {
            contentType: file.type || "application/octet-stream",
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadErr || !uploadData) {
          throw new Error("Storage upload failed: " + (uploadErr?.message ?? JSON.stringify(uploadErr)));
        }

        // get public URL (this returns a full URL when bucket is public)
        const { publicUrl } = supabaseAdmin.storage.from("attachments").getPublicUrl(uploadData.path).data;
        if (!publicUrl) throw new Error("Failed to get publicUrl");

        // insert into Neon with the public URL
        const res = await client.query(
          `INSERT INTO community_attachments (post_id, url, filename, mime_type, size_bytes, uploaded_at)
           VALUES ($1,$2,$3,$4,$5, now())
           RETURNING id, url, filename, mime_type, size_bytes, uploaded_at`,
          [postId, publicUrl, file.name, file.type ?? null, file.size ?? null]
        );
        inserted.push(res.rows[0]);
      }

      await client.query("COMMIT");
      return NextResponse.json({ attachments: inserted });
    } catch (err: any) {
      try { await client.query("ROLLBACK"); } catch (_) {}
      console.error("[upload-and-record] error:", err);
      return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("[upload-and-record] request parse error:", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
