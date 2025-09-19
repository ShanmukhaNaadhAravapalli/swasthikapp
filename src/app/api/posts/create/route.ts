// app/api/posts/create/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

export const runtime = "nodejs";

type Body = {
  content: string;
  attachments?: string[]; // array of URLs
  is_anonymous?: boolean;
  provider_user_id?: string | null;
  userId?: string | null; // optional explicit UUID if you have one
  display_name?: string | null;
};

function looksLikeUUID(v: any) {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

const PERSPECTIVE_KEY = process.env.PERSPECTIVE_API_KEY || "";
const THRESHOLD = Number(process.env.PERSPECTIVE_THRESHOLD ?? 0.75);

/**
 * Calls the Perspective Comment Analyzer and returns scores.
 * Returns { skipped: true } if no key configured.
 */
async function checkPerspective(text: string) {
  if (!PERSPECTIVE_KEY) return { skipped: true, scores: {} };

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
    throw new Error("Perspective API error: " + txt);
  }

  const j = await res.json();
  const scores: Record<string, number> = {};
  for (const k of Object.keys(j.attributeScores || {})) {
    const s = j.attributeScores[k]?.summaryScore?.value;
    scores[k] = typeof s === "number" ? s : 0;
  }
  return { skipped: false, scores };
}

export async function POST(req: Request) {
  const client = await pool.connect();
  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      return NextResponse.json({ error: "Expected application/json" }, { status: 400 });
    }

    const body = (await req.json().catch((e) => {
      throw new Error("Invalid JSON body: " + String(e?.message ?? e));
    })) as Body;

    const content = (body.content || "").trim();
    if (!content) return NextResponse.json({ error: "content required" }, { status: 400 });

    // ----- MODERATION CHECK (Perspective) -----
    try {
      const mod = await checkPerspective(content);
      if (!mod.skipped) {
        const { scores } = mod;
        const blocked =
          (scores.TOXICITY ?? 0) >= THRESHOLD ||
          (scores.SEVERE_TOXICITY ?? 0) >= THRESHOLD ||
          (scores.PROFANITY ?? 0) >= THRESHOLD ||
          (scores.INSULT ?? 0) >= THRESHOLD;

        if (blocked) {
          // Return early and do NOT write to DB
          return NextResponse.json(
            {
              error: "Sensitive content detected — you cannot post this.",
              // optional: details for debugging; remove in production if you don't want to expose internals
              details: scores,
            },
            { status: 400 }
          );
        }
      } else {
        // No key configured -> skip moderation (change to fail-closed if you prefer)
        console.warn("[create] Perspective key not configured; skipping moderation.");
      }
    } catch (modErr: any) {
      // If Perspective fails, choose fail-open (allow) or fail-closed (block).
      // Current behaviour: fail-open (log and continue). Change as desired.
      console.error("[create] Perspective check failed, allowing post. Error:", String(modErr?.message ?? modErr));
    }
    // ----- END moderation -----

    await client.query("BEGIN");

    // Resolve/create user:
    // Priority: explicit userId (UUID) -> provider_user_id -> null (anonymous)
    let userId: string | null = null;

    if (body.userId && looksLikeUUID(body.userId)) {
      // If explicit UUID given, try to find user; if not found, create a user row with that id
      const check = await client.query(`SELECT id FROM community_users WHERE id = $1 LIMIT 1`, [body.userId]);
      if (check.rows?.length) {
        userId = check.rows[0].id;
      } else {
        const ins = await client.query(
          `INSERT INTO community_users (id, provider, provider_user_id, display_name, created_at, last_seen)
           VALUES ($1,$2,$3,$4, now(), now())
           RETURNING id`,
          [body.userId, "local", null, body.display_name ?? null]
        );
        userId = ins.rows?.[0]?.id ?? body.userId;
      }
    } else if (body.provider_user_id) {
      // Upsert by provider_user_id (client-generated id)
      const up = await client.query(
        `INSERT INTO community_users (provider, provider_user_id, display_name, created_at, last_seen)
         VALUES ($1,$2,$3, now(), now())
         ON CONFLICT (provider, provider_user_id) DO UPDATE SET last_seen = now(), display_name = COALESCE(EXCLUDED.display_name, community_users.display_name)
         RETURNING id`,
        ["external", body.provider_user_id, body.display_name ?? null]
      );
      userId = up.rows?.[0]?.id ?? null;
    } else {
      userId = null;
    }

    // Insert post with owner user_id (may be null if anonymous)
    const ins = await client.query(
      `INSERT INTO community_posts (user_id, content, enhanced_content, is_anonymous, moderation_status, created_at)
       VALUES ($1,$2,$3,$4,$5, now())
       RETURNING id, created_at, user_id`,
      [userId, content, null, body.is_anonymous ?? true, "pending"]
    );
    const postId = ins.rows[0].id;
    const createdAt = ins.rows[0].created_at;
    const postOwnerId = ins.rows[0].user_id ?? null;

    // Attachments
    if (Array.isArray(body.attachments) && body.attachments.length > 0) {
      for (const url of body.attachments) {
        if (typeof url !== "string") continue;
        await client.query(
          `INSERT INTO community_attachments (post_id, url, uploaded_at) VALUES ($1,$2, now())`,
          [postId, url]
        );
      }
    }

    // Extract hashtags and upsert tags and mapping
    const tagMatches = Array.from(
      new Set(Array.from(content.matchAll(/#([a-z0-9\-_]+)/ig)).map((m) => m[1].toLowerCase()))
    );
    for (const tag of tagMatches) {
      const t = await client.query(`SELECT id FROM community_hashtags WHERE tag = $1 LIMIT 1`, [tag]);
      let tagId = t.rows?.[0]?.id ?? null;
      if (!tagId) {
        const r = await client.query(`INSERT INTO community_hashtags (tag) VALUES ($1) RETURNING id`, [tag]);
        tagId = r.rows?.[0]?.id ?? null;
      }
      if (tagId) {
        await client.query(
          `INSERT INTO community_post_tags (post_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [postId, tagId]
        );
      }
    }

    await client.query("COMMIT");

    return NextResponse.json({
      post: {
        id: postId,
        content,
        created_at: createdAt,
        user_id: postOwnerId,
        attachments: body.attachments ?? [],
      },
    });
  } catch (err: any) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}
    console.error("[create] error:", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  } finally {
    client.release();
  }
}
