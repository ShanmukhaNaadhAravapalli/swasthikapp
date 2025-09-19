// app/api/uploads/recordSupabase/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { postId, url, filename, mime_type, size_bytes } = body ?? {};
  if (!postId || !url) return NextResponse.json({ error: "missing" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("community_attachments")
    .insert([{
      post_id: postId,
      url,
      filename,
      mime_type,
      size_bytes,
      uploaded_at: new Date().toISOString()
    }]);
  if (error) {
    console.error("supabase insert error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ attachment: data?.[0] ?? null });
}
