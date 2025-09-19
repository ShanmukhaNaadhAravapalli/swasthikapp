// app/api/posts/save/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

export const runtime = "nodejs";

function looksLikeUUID(v: any) {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

/**
 * POST body:
 * {
 *   postId: "<post uuid>",
 *   userId?: "<user uuid>",            // optional if provider_user_id provided
 *   provider_user_id?: "<client-id>",  // optional: client generated id
 *   display_name?: "You"
 * }
 *
 * Response:
 * { saved: true } // after created
 * or
 * { saved: false } // after deleted (unsaved)
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  console.log("[/api/posts/save] body:", body);

  const postId = body?.postId;
  let userId = body?.userId ?? null;
  const providerUserId = body?.provider_user_id ?? body?.providerUserId ?? null;
  const display_name = body?.display_name ?? null;

  if (!postId) {
    return NextResponse.json({ error: "postId required" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify post exists
    const postRes = await client.query(`SELECT id FROM community_posts WHERE id = $1 LIMIT 1`, [postId]);
    if (!postRes.rows?.length) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "post not found" }, { status: 404 });
    }

    // Validate provided userId exists; else ignore it
    if (userId) {
      if (!looksLikeUUID(userId)) {
        console.warn("[/api/posts/save] provided userId not a UUID, clearing it:", userId);
        userId = null;
      } else {
        const chk = await client.query(`SELECT id FROM community_users WHERE id = $1 LIMIT 1`, [userId]);
        if (!chk.rows?.length) {
          console.warn("[/api/posts/save] userId not found in community_users, clearing it:", userId);
          userId = null;
        }
      }
    }

    // Resolve/create by provider_user_id if no valid userId
    if (!userId && providerUserId) {
      const findRes = await client.query(
        `SELECT id FROM community_users WHERE provider_user_id = $1 LIMIT 1`,
        [providerUserId]
      );
      if (findRes.rows?.length) {
        userId = findRes.rows[0].id;
      } else {
        const insertUser = await client.query(
          `INSERT INTO community_users (provider, provider_user_id, display_name, created_at, last_seen)
           VALUES ($1,$2,$3, now(), now())
           RETURNING id`,
          ["local", providerUserId, display_name ?? null]
        );
        userId = insertUser.rows[0].id;
      }
    }

    // If still no userId -> treat as anonymous (store with user_id NULL)
    // But usually we want saves associated with a user; if you prefer to force user, return 400 here.

    // Check if a save already exists for this user/post
    const existsRes = await client.query(
      `SELECT id FROM community_saves WHERE post_id = $1 AND ${userId ? "user_id = $2" : "user_id IS NULL LIMIT 1"}`,
      userId ? [postId, userId] : [postId]
    );

    // If exists -> delete it (toggle off). Otherwise create.
    let saved = true;
    if (existsRes.rows?.length) {
      const saveId = existsRes.rows[0].id;
      await client.query(`DELETE FROM community_saves WHERE id = $1`, [saveId]);
      saved = false;
    } else {
      await client.query(
        `INSERT INTO community_saves (post_id, user_id, created_at) VALUES ($1, $2, now())`,
        [postId, userId]
      );
      saved = true;
    }

    await client.query("COMMIT");
    return NextResponse.json({ saved });
  } catch (err: any) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    console.error("[/api/posts/save] error:", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  } finally {
    client.release();
  }
}
