// app/api/posts/comment/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

export const runtime = "nodejs";

const PERSPECTIVE_KEY = process.env.PERSPECTIVE_API_KEY || "";
const THRESHOLD = Number(process.env.PERSPECTIVE_THRESHOLD ?? 0.75);

/**
 * Calls Perspective. Throws if key is missing or API/network error occurs.
 * Returns scores map when successful.
 */
async function callPerspectiveOrThrow(text: string): Promise<Record<string, number>> {
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

  const j = await res.json();
  const scores: Record<string, number> = {};
  for (const k of Object.keys(j.attributeScores || {})) {
    const v = j.attributeScores[k]?.summaryScore?.value;
    scores[k] = typeof v === "number" ? v : 0;
  }
  return scores;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const postId: string | undefined = body?.postId;
  const userId: string | null = body?.userId ?? null;
  const content: string = (body?.content || "").trim();

  console.log("[/api/posts/comment] received body:", body);

  if (!postId || !content) {
    console.warn("[/api/posts/comment] missing postId or content");
    return NextResponse.json({ error: "postId and non-empty content required" }, { status: 400 });
  }

  // --- Run moderation first (fail-closed) ---
  let scores: Record<string, number> = {};
  try {
    scores = await callPerspectiveOrThrow(content);
  } catch (err: any) {
    console.error("[/api/posts/comment] Perspective unavailable or misconfigured:", String(err?.message ?? err));
    // Fail closed: do NOT persist. Inform caller that moderation is unavailable.
    return NextResponse.json(
      { error: "Moderation service not configured or unavailable. Comment rejected." },
      { status: 503 }
    );
  }

  console.log("[/api/posts/comment] perspective scores:", scores);

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
      },
      { status: 400 }
    );
  }
  // --- End moderation: only if we reach here do we persist ---

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const insertSql =
      "INSERT INTO community_comments (post_id, user_id, content, created_at) VALUES ($1,$2,$3, now()) RETURNING id, created_at";
    const ins = await client.query(insertSql, [postId, userId, content]);

    const commentId = ins.rows[0].id;
    const createdAt = ins.rows[0].created_at;

    // notify post owner (if different)
    const ownerRes = await client.query("SELECT user_id FROM community_posts WHERE id = $1 LIMIT 1", [postId]);
    const ownerId = ownerRes.rows?.[0]?.user_id ?? null;

    if (ownerId && ownerId !== userId) {
      await client.query(
        "INSERT INTO community_notifications (user_id, actor_user_id, type, post_id, comment_id, created_at) VALUES ($1,$2,$3,$4,$5, now())",
        [ownerId, userId, "comment", postId, commentId]
      );
    }

    await client.query("COMMIT");

    const comment = {
      id: commentId,
      postId,
      userId,
      content,
      created_at: createdAt,
    };

    console.log("[/api/posts/comment] saved comment id:", commentId);
    return NextResponse.json({ comment });
  } catch (err: any) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}
    console.error("[/api/posts/comment] DB error:", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  } finally {
    client.release();
  }
}
