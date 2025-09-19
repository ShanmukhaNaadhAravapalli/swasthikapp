// src/app/api/notifications/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  community_notifications,
  community_users,
  community_posts,
} from "@/db/communitySchema";
import { eq, desc } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const provider = url.searchParams.get("provider_user_id");

    let resolvedUserId = userId ?? null;

    if (!resolvedUserId && provider) {
      const found = await db.select().from(community_users).where(eq(community_users.provider_user_id, provider)).limit(1);
      if (found.length) resolvedUserId = found[0].id;
      else return NextResponse.json({ notifications: [] });
    }

    if (!resolvedUserId) return NextResponse.json({ notifications: [] });

    const rows = await db
      .select({
        id: community_notifications.id,
        type: community_notifications.type,
        post_id: community_notifications.post_id,
        comment_id: community_notifications.comment_id,
        actor_user_id: community_notifications.actor_user_id,
        read: community_notifications.read,
        created_at: community_notifications.created_at,
      })
      .from(community_notifications)
      .where(eq(community_notifications.user_id, resolvedUserId))
      .orderBy(desc(community_notifications.created_at));

    // Enrich with actor display_name and post content (simple)
    const out = await Promise.all(rows.map(async (n) => {
      let actor = null;
      if (n.actor_user_id) {
        const a = await db.select().from(community_users).where(eq(community_users.id, n.actor_user_id)).limit(1);
        actor = a.length ? a[0] : null;
      }
      const post = n.post_id ? (await db.select().from(community_posts).where(eq(community_posts.id, n.post_id)).limit(1)) : [];
      return {
        id: n.id,
        type: n.type,
        post_id: n.post_id,
        comment_id: n.comment_id,
        actor_user_id: n.actor_user_id,
        actor_name: actor?.display_name ?? (actor?.provider_user_id ? actor.provider_user_id : "Someone"),
        post_content: post.length ? post[0].content : "",
        read: n.read,
        created_at: n.created_at,
      };
    }));

    return NextResponse.json({ notifications: out });
  } catch (err: any) {
    console.error("[/api/notifications] error:", err);
    return NextResponse.json({ notifications: [] });
  }
}
