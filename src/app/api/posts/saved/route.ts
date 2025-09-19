// app/api/posts/saved/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

export const runtime = "nodejs";

/**
 * GET /api/posts/saved?userId=<uuid>  OR ?provider_user_id=<client-id>
 *
 * Returns:
 * { posts: [ ... ] }
 *
 * Each post object will contain fields similar to your feed's post shape: id, content, created_at, user_id, etc.
 * Adjust SELECT as needed to return author/display_name or attachments.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const providerUserId = url.searchParams.get("provider_user_id");

  const client = await pool.connect();
  try {
    let resolvedUserId = userId ?? null;

    // if provider_user_id provided, resolve to user id (if exists)
    if (!resolvedUserId && providerUserId) {
      const r = await client.query(`SELECT id FROM community_users WHERE provider_user_id = $1 LIMIT 1`, [providerUserId]);
      if (r.rows?.length) resolvedUserId = r.rows[0].id;
      else {
        // no user -> return empty saved list
        return NextResponse.json({ posts: [] });
      }
    }

    if (!resolvedUserId) {
      // no user specified -> cannot return personalized saved posts
      return NextResponse.json({ posts: [] });
    }

    // join saved -> posts -> optionally users for author display_name
    const res = await client.query(
      `SELECT p.id, p.user_id, p.content, p.created_at, p.is_anonymous
       FROM community_saves s
       JOIN community_posts p ON p.id = s.post_id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC
       LIMIT 200`,
      [resolvedUserId]
    );

    const rows = res.rows ?? [];
    return NextResponse.json({ posts: rows });
  } catch (err: any) {
    console.error("[/api/posts/saved] error:", err);
    return NextResponse.json({ posts: [] });
  } finally {
    client.release();
  }
}
