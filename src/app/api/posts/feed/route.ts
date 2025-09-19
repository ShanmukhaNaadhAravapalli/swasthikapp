// app/api/posts/feed/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";
export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

function buildPublicUrlFromPath(path: string) {
  if (!path) return path;
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${cleanPath}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  let userId = url.searchParams.get("userId");
  const providerUserId = url.searchParams.get("provider_user_id");
  const client = await pool.connect();
  try {
    if (!userId && providerUserId) {
      const r = await client.query(`SELECT id FROM community_users WHERE provider_user_id = $1 LIMIT 1`, [providerUserId]);
      if (r.rows?.length) userId = r.rows[0].id;
    }

    const rows = await client.query(
      `SELECT p.id, p.user_id, p.content, p.created_at, p.is_anonymous,
              COALESCE(l.likes_count,0) AS likes,
              COALESCE(s.supports_count,0) AS supports,
              COALESCE(c.comments_count,0) AS comments_count,
              CASE WHEN ul.id IS NULL THEN false ELSE true END AS viewer_liked,
              CASE WHEN us.id IS NULL THEN false ELSE true END AS viewer_supported,
              CASE WHEN sv.id IS NULL THEN false ELSE true END AS viewer_saved,
              COALESCE(a.attachments, '[]'::json) AS attachments
       FROM community_posts p
       LEFT JOIN (SELECT post_id, COUNT(*) AS likes_count FROM community_likes GROUP BY post_id) l ON l.post_id = p.id
       LEFT JOIN (SELECT post_id, COUNT(*) AS supports_count FROM community_supports GROUP BY post_id) s ON s.post_id = p.id
       LEFT JOIN (SELECT post_id, COUNT(*) AS comments_count FROM community_comments GROUP BY post_id) c ON c.post_id = p.id
       LEFT JOIN community_likes ul ON ul.post_id = p.id ${userId ? "AND ul.user_id = $1" : "AND ul.user_id IS NULL AND false"}
       LEFT JOIN community_supports us ON us.post_id = p.id ${userId ? "AND us.user_id = $1" : "AND us.user_id IS NULL AND false"}
       LEFT JOIN community_saves sv ON sv.post_id = p.id ${userId ? "AND sv.user_id = $1" : "AND sv.user_id IS NULL AND false"}
       LEFT JOIN (
         SELECT post_id,
                json_agg(json_build_object('id', id, 'url', url, 'filename', filename, 'mime_type', mime_type, 'size_bytes', size_bytes, 'uploaded_at', uploaded_at) ORDER BY uploaded_at DESC) AS attachments
         FROM community_attachments
         GROUP BY post_id
       ) a ON a.post_id = p.id
       ORDER BY p.created_at DESC
       LIMIT 200`,
      userId ? [userId] : []
    );

    const posts = (rows.rows ?? []).map((r: any) => {
      const rawAttachments = Array.isArray(r.attachments) ? r.attachments : [];
      const attachments = rawAttachments.map((att: any) => {
        const urlVal = (att?.url ?? "") as string;
        if (!urlVal) return att;
        if (/^https?:\/\//i.test(urlVal)) return att;
        return { ...att, url: buildPublicUrlFromPath(String(urlVal)) };
      });
      return {
        id: r.id,
        user_id: r.user_id,
        content: r.content,
        created_at: r.created_at,
        is_anonymous: r.is_anonymous,
        likes: Number(r.likes ?? 0),
        supports: Number(r.supports ?? 0),
        commentsCount: Number(r.comments_count ?? 0),
        viewerLiked: r.viewer_liked === true,
        viewerSupported: r.viewer_supported === true,
        viewerSaved: r.viewer_saved === true,
        attachments,
      };
    });

    return NextResponse.json({ posts });
  } catch (err: any) {
    console.error("[/api/posts/feed] error:", err);
    return NextResponse.json({ posts: [] });
  } finally {
    client.release();
  }
}
