// app/api/uploads/record/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { postId, url, filename, mime_type, size_bytes } = body ?? {};

  if (!postId || !url) {
    return NextResponse.json({ error: "missing postId or url" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const res = await client.query(
      `INSERT INTO community_attachments (post_id, url, filename, mime_type, size_bytes, uploaded_at)
       VALUES ($1,$2,$3,$4,$5, now())
       RETURNING id, url, filename, mime_type, size_bytes, uploaded_at`,
      [postId, url, filename ?? null, mime_type ?? null, size_bytes ?? null]
    );
    return NextResponse.json({ attachment: res.rows[0] });
  } catch (err: any) {
    console.error("record attachment error", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  } finally {
    client.release();
  }
}
