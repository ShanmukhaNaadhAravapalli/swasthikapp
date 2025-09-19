// app/api/posts/search/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ posts: [] });

  let client = await pool.connect();
  try {
    if (q.startsWith("#")) {
      const tag = q.slice(1).toLowerCase();
      // find tag id
      const tagRow = await client.query(`SELECT id FROM community_hashtags WHERE tag = $1 LIMIT 1`, [tag]);
      if (!tagRow.rows?.length) return NextResponse.json({ posts: [] });
      const tagId = tagRow.rows[0].id;
      const rows = await client.query(
        `SELECT p.id, p.content, p.enhanced_content, p.is_anonymous, p.created_at
         FROM community_posts p
         JOIN community_post_tags pt ON pt.post_id = p.id
         WHERE pt.tag_id = $1
         ORDER BY p.created_at DESC
         LIMIT 100`,
        [tagId]
      );
      const posts = rows.rows ?? [];
      return NextResponse.json({ posts });
    }

    // text search (ILIKE)
    const rows = await client.query(
      `SELECT id, content, enhanced_content, is_anonymous, created_at
       FROM community_posts
       WHERE content ILIKE $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [`%${q}%`]
    );
    return NextResponse.json({ posts: rows.rows ?? [] });
  } catch (err: any) {
    console.error("[search] error:", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  } finally {
    client.release();
  }
}
