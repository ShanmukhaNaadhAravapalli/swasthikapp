// src/app/api/posts/support/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  community_supports,
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
  let userId = body?.userId ?? null;
  const provider = body?.provider_user_id ?? null;

  if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 });

  try {
    const result = await db.transaction(async (tx) => {
      // resolve/create actor
      if (userId) {
        const u = await ensureUserExistsWithId(tx, userId);
        if (u) userId = u.id;
        else userId = null;
      } else if (provider) {
        const byProv = await resolveOrCreateByProvider(tx, provider);
        if (byProv) { userId = byProv.id; }
      }

      // find post & owner
      const posts = await tx.select().from(community_posts).where(eq(community_posts.id, postId)).limit(1);
      if (!posts.length) throw new Error("post not found");
      const ownerId = posts[0].user_id ?? null;

      // existing support?
      let existing;
      if (userId) {
        existing = await tx
          .select()
          .from(community_supports)
          .where(and(eq(community_supports.post_id, postId), eq(community_supports.user_id, userId)))
          .limit(1);
      } else {
        existing = await tx
          .select()
          .from(community_supports)
          .where(and(eq(community_supports.post_id, postId), isNull(community_supports.user_id)))
          .limit(1);
      }

      let supported = false;
      if (existing.length) {
        await tx.delete(community_supports).where(eq(community_supports.id, existing[0].id));
        supported = false;
      } else {
        await tx.insert(community_supports).values({ post_id: postId, user_id: userId });
        supported = true;

        if (ownerId && ownerId !== userId) {
          await tx.insert(community_notifications).values({
            user_id: ownerId,
            actor_user_id: userId,
            type: "support",
            post_id: postId,
          });
        }
      }

      const [{ cnt }] = await tx
        .select({ cnt: sql`count(*)` })
        .from(community_supports)
        .where(eq(community_supports.post_id, postId));

      return { supported, supportsCount: Number((cnt as any) ?? 0) };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[/api/posts/support] error:", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
