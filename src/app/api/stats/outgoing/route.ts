// app/api/stats/outgoing/route.ts
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days") ?? 30)));

    if (!userId) {
      return NextResponse.json({ error: "missing userId" }, { status: 400 });
    }

    const sql = `
      WITH days AS (
        SELECT generate_series(current_date - ($1::int - 1), current_date, '1 day')::date AS day
      ),
      l AS (
        SELECT created_at::date AS d, count(*) AS likes
        FROM community_likes
        WHERE user_id = $2::uuid
        GROUP BY created_at::date
      ),
      s AS (
        SELECT created_at::date AS d, count(*) AS supports
        FROM community_supports
        WHERE user_id = $2::uuid
        GROUP BY created_at::date
      ),
      c AS (
        SELECT created_at::date AS d, count(*) AS comments
        FROM community_comments
        WHERE user_id = $2::uuid
        GROUP BY created_at::date
      )
      SELECT to_char(days.day, 'YYYY-MM-DD') AS date,
             COALESCE(l.likes, 0) AS likes,
             COALESCE(s.supports, 0) AS supports,
             COALESCE(c.comments, 0) AS comments
      FROM days
      LEFT JOIN l ON l.d = days.day
      LEFT JOIN s ON s.d = days.day
      LEFT JOIN c ON c.d = days.day
      ORDER BY days.day;
    `;

    const client = await pool.connect();
    try {
      const { rows } = await client.query(sql, [days, userId]);
      // rows already have date string and numeric counts
      return NextResponse.json(rows);
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("stats/outgoing error:", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
