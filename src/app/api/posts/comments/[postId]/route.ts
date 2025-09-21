// app/api/posts/comments/[postId]/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  if (!postId) return NextResponse.json({ comments: [] });

  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT id, post_id, user_id, content, created_at
       FROM community_comments
       WHERE post_id = $1
       ORDER BY created_at ASC`,
      [postId]
    );

    // Map rows to the shape CommentsPanel expects (include display_name if available)
    const rows = res.rows ?? [];
    // fetch display names for user ids in-line (if you want display_name in response, you can join)
    // For simplicity return basic fields; CommentsPanel will show "Anonymous" / "You" as needed.
    return NextResponse.json({ comments: rows });
  } catch (err) {
    console.error("[/api/posts/comments] error:", err);
    return NextResponse.json({ comments: [] });
  } finally {
    client.release();
  }
}
