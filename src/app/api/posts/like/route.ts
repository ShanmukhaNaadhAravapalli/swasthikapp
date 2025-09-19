// src/app/api/posts/like/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  community_likes,
  community_posts,
  community_users,
  community_notifications,
} from "@/db/communitySchema";
import { eq, and, isNull, sql } from "drizzle-orm";

export const runtime = "nodejs";

async function findUserById(tx: any, id: string | null) {
  if (!id) return null;
  const r = await tx.select().from(community_users).where(eq(community_users.id, id)).limit(1);
  return r.length ? r[0] : null;
}

async function resolveOrCreateByProvider(tx: any, providerUserId?: string | null) {
  if (!providerUserId) return null;
  const f = await tx
    .select()
    .from(community_users)
    .where(eq(community_users.provider_user_id, providerUserId))
    .limit(1);
  if (f.length) return f[0];

  const inserted = await tx
    .insert(community_users)
    .values({
      provider: "local",
      provider_user_id: providerUserId,
      display_name: null,
    })
    .returning({ id: community_users.id, provider_user_id: community_users.provider_user_id });
  return inserted[0];
}

async function ensureUserExistsWithId(tx: any, userId?: string | null) {
  if (!userId) return null;
  const found = await findUserById(tx, userId);
  if (found) return found;
  const inserted = await tx
    .insert(community_users)
    .values({
      id: userId,
      provider: "local",
      provider_user_id: null,
      display_name: null,
    })
    .returning({ id: community_users.id });
  return inserted[0];
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const postId = body?.postId;
  let userId = body?.userId ?? null; // uuid or null
  const provider = body?.provider_user_id ?? null;

  if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 });

  try {
    const result = await db.transaction(async (tx) => {
      // Resolve/create actor user:
      let actorUser = null;
      if (userId) {
        actorUser = await ensureUserExistsWithId(tx, userId);
        if (actorUser) userId = actorUser.id;
        else userId = null;
      } else if (provider) {
        const byProv = await resolveOrCreateByProvider(tx, provider);
        if (byProv) {
          userId = byProv.id;
          actorUser = byProv;
        }
      }

      // find post & owner
      const posts = await tx.select().from(community_posts).where(eq(community_posts.id, postId)).limit(1);
      if (!posts.length) throw new Error("post not found");
      const ownerId = posts[0].user_id ?? null;

      // find existing like (either by user_id or anonymous (NULL))
      let existing;
      if (userId) {
        existing = await tx
          .select()
          .from(community_likes)
          .where(and(eq(community_likes.post_id, postId), eq(community_likes.user_id, userId)))
          .limit(1);
      } else {
        existing = await tx
          .select()
          .from(community_likes)
          .where(and(eq(community_likes.post_id, postId), isNull(community_likes.user_id)))
          .limit(1);
      }

      let liked = false;
      if (existing.length) {
        // toggle off
        await tx.delete(community_likes).where(eq(community_likes.id, existing[0].id));
        liked = false;
      } else {
        // insert like (user_id may be null)
        await tx.insert(community_likes).values({ post_id: postId, user_id: userId });
        liked = true;

        // create notification for the post owner (if exists and not actor)
        if (ownerId && ownerId !== userId) {
          await tx.insert(community_notifications).values({
            user_id: ownerId,
            actor_user_id: userId,
            type: "like",
            post_id: postId,
          });
        }
      }

      const [{ cnt }] = await tx
        .select({ cnt: sql`count(*)` })
        .from(community_likes)
        .where(eq(community_likes.post_id, postId));

      return { liked, likesCount: Number((cnt as any) ?? 0) };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[/api/posts/like] error:", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
