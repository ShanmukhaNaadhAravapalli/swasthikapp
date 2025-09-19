// app/api/activity/outgoing/route.ts
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const limit = Math.min(200, Number(url.searchParams.get("limit") ?? 80));

    if (!userId) {
      return NextResponse.json({ error: "missing userId" }, { status: 400 });
    }

    const sql = `
      SELECT kind, id, post_id, snippet, created_at
      FROM (
        SELECT 'like' AS kind, cl.id::text AS id, cl.post_id::text, NULL::text AS snippet, cl.created_at
        FROM community_likes cl
        WHERE cl.user_id = $1
        UNION ALL
        SELECT 'support' AS kind, cs.id::text AS id, cs.post_id::text, NULL::text AS snippet, cs.created_at
        FROM community_supports cs
        WHERE cs.user_id = $1
        UNION ALL
        SELECT 'comment' AS kind, cc.id::text AS id, cc.post_id::text, LEFT(cc.content, 200) AS snippet, cc.created_at
        FROM community_comments cc
        WHERE cc.user_id = $1
      ) t
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const client = await pool.connect();
    try {
      const { rows } = await client.query(sql, [userId, limit]);
      // For likes/supports we may want a post_excerpt: fetch a short excerpt for post_id
      const postIds = Array.from(new Set(rows.filter((r: any) => r.post_id).map((r: any) => r.post_id)));
      let postMap: Record<string, string> = {};
      if (postIds.length > 0) {
        const q = `
          SELECT id::text, LEFT(content, 200) AS excerpt
          FROM community_posts
          WHERE id = ANY($1::uuid[])
        `;
        const pr = await client.query(q, [postIds]);
        for (const r of pr.rows) postMap[r.id] = r.excerpt;
      }

      const actions = rows.map((r: any) => ({
        kind: r.kind,
        id: r.id,
        post_id: r.post_id,
        post_excerpt: r.post_id ? postMap[r.post_id] ?? null : null,
        comment_snippet: r.kind === "comment" ? r.snippet : null,
        created_at: r.created_at.toISOString(),
      }));

      return NextResponse.json({ actions });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("activity/outgoing error:", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
