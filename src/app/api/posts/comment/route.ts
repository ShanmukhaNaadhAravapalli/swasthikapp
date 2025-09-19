// app/api/posts/comment/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

export const runtime = "nodejs";

const PERSPECTIVE_KEY = process.env.PERSPECTIVE_API_KEY ?? "";
const THRESHOLD = Number(process.env.PERSPECTIVE_THRESHOLD ?? 0.75);

function looksLikeUUID(v: any) {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

/**
 * Call Perspective and return { raw, scores }.
 * Throws when API key missing or network/API error happens.
 */
async function callPerspectiveOrThrow(text: string): Promise<{ raw: any; scores: Record<string, number> }> {
  if (!PERSPECTIVE_KEY) {
    throw new Error("PERSPECTIVE_API_KEY not configured");
  }

  const url = `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${encodeURIComponent(
    PERSPECTIVE_KEY
  )}`;

  const body = {
    comment: { text },
    requestedAttributes: {
      TOXICITY: {},
      SEVERE_TOXICITY: {},
      PROFANITY: {},
      INSULT: {},
      THREAT: {},
      IDENTITY_ATTACK: {},
    },
    languages: ["en"],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Perspective API error: ${res.status} ${txt}`);
  }

  const j = await res.json().catch(() => null);
  const attr = j?.attributeScores ?? j?.attribute_scores ?? null;
  const scores: Record<string, number> = {};

  if (attr && typeof attr === "object") {
    for (const k of Object.keys(attr)) {
      try {
        const v = attr[k]?.summaryScore?.value;
        scores[k] = typeof v === "number" ? v : 0;
      } catch {
        scores[k] = 0;
      }
    }
  }

  return { raw: j, scores };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  console.log("[/api/posts/comment] received body:", {
    postId: body?.postId,
    userId: body?.userId,
    provider_user_id: body?.provider_user_id ?? body?.providerUserId,
    contentPreview: (body?.content || "").slice(0, 200),
  });

  const postId = body?.postId;
  let userId = body?.userId ?? null; // may be UUID or some dev string
  const providerUserId = body?.provider_user_id ?? body?.providerUserId ?? null;
  const display_name = body?.display_name ?? null;
  const content = (body?.content || "").trim();

  if (!postId || !content) {
    return NextResponse.json({ error: "postId and content required" }, { status: 400 });
  }

  // --- Moderation: run first (fail-closed) ---
  let perspectiveRaw: any = null;
  let scores: Record<string, number> = {};
  try {
    const resp = await callPerspectiveOrThrow(content);
    perspectiveRaw = resp.raw;
    scores = resp.scores;
  } catch (err: any) {
    console.error("[/api/posts/comment] Perspective unavailable or misconfigured:", String(err?.message ?? err));
    // Fail closed: do NOT persist. Inform caller that moderation is unavailable.
    return NextResponse.json(
      { error: "Moderation service not configured or unavailable. Comment rejected." },
      { status: 503 }
    );
  }

  console.log("[/api/posts/comment] perspective raw:", JSON.stringify(perspectiveRaw?.attributeScores ?? perspectiveRaw, null, 2));
  console.log("[/api/posts/comment] perspective scores:", scores);

  const hasAnyScore = Object.keys(scores).length > 0;
  if (!hasAnyScore) {
    console.warn("[/api/posts/comment] perspective returned no attribute scores — rejecting to be safe");
    return NextResponse.json(
      { error: "Moderation failed to classify comment — rejected to be safe.", details: scores },
      { status: 400 }
    );
  }

  const blocked =
    (scores.TOXICITY ?? 0) >= THRESHOLD ||
    (scores.SEVERE_TOXICITY ?? 0) >= THRESHOLD ||
    (scores.PROFANITY ?? 0) >= THRESHOLD ||
    (scores.INSULT ?? 0) >= THRESHOLD ||
    (scores.THREAT ?? 0) >= THRESHOLD ||
    (scores.IDENTITY_ATTACK ?? 0) >= THRESHOLD;

  if (blocked) {
    console.warn("[/api/posts/comment] blocked by moderation:", scores);
    return NextResponse.json(
      {
        error: "Sensitive content detected — you cannot post this.",
        details: scores,
        raw: perspectiveRaw?.attributeScores ?? perspectiveRaw,
      },
      { status: 400 }
    );
  }
  // --- End moderation; if we reach here, it's allowed ---

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // verify the provided userId actually exists in community_users; if not, clear it.
    if (userId) {
      if (!looksLikeUUID(userId)) {
        console.warn("[/api/posts/comment] userId provided but not a UUID; ignoring userId:", userId);
        userId = null;
      } else {
        const check = await client.query(`SELECT id FROM community_users WHERE id = $1 LIMIT 1`, [userId]);
        if (!check.rows?.length) {
          console.warn("[/api/posts/comment] userId UUID not found in community_users; ignoring userId:", userId);
          userId = null;
        }
      }
    }

    // If no userId but providerUserId is present, resolve-or-create a community_users row
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

    // Ensure the post exists and get owner
    const postRes = await client.query(`SELECT id, user_id FROM community_posts WHERE id = $1 LIMIT 1`, [postId]);
    if (!postRes.rows?.length) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "post not found" }, { status: 404 });
    }

    // Insert the comment. If userId is null, this inserts user_id = NULL which satisfies FK.
    const ins = await client.query(
      `INSERT INTO community_comments (post_id, user_id, content, created_at)
       VALUES ($1, $2, $3, now())
       RETURNING id, post_id, user_id, content, created_at`,
      [postId, userId, content]
    );

    const row = ins.rows[0];
    const commentId = row.id;
    const createdAt = row.created_at;

    // Notify post owner if exists and actor is different (actor may be null for anonymous)
    const ownerId = postRes.rows[0].user_id ?? null;
    if (ownerId && ownerId !== userId) {
      await client.query(
        `INSERT INTO community_notifications (user_id, actor_user_id, type, post_id, comment_id, created_at)
         VALUES ($1, $2, $3, $4, $5, now())`,
        [ownerId, userId, "comment", postId, commentId]
      );
    }

    // Updated comments count
    const cntRes = await client.query(`SELECT COUNT(*)::int AS cnt FROM community_comments WHERE post_id = $1`, [postId]);
    const commentsCount = cntRes.rows?.[0]?.cnt ?? null;

    await client.query("COMMIT");

    // Fetch display_name when possible
    let commenterDisplayName = display_name ?? null;
    if (userId && !commenterDisplayName) {
      const uRes = await client.query(`SELECT display_name FROM community_users WHERE id = $1 LIMIT 1`, [userId]);
      commenterDisplayName = uRes.rows?.[0]?.display_name ?? null;
    }

    const comment = {
      id: commentId,
      post_id: postId,
      userId: userId,
      content,
      created_at: createdAt,
      display_name: commenterDisplayName ?? (userId ? "User" : "Anonymous"),
    };

    return NextResponse.json({ comment, commentsCount });
  } catch (err: any) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    console.error("[/api/posts/comment] error:", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  } finally {
    client.release();
  }
}
