// app/api/mood/stats/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { mood } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc, sql } from "drizzle-orm";

/** Day start (00:00) in Asia/Kolkata for a Date -> returns YYYY-MM-DD and start/end Date objects */
function kolkataDayKey(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const day = `${map.year}-${map.month}-${map.day}`; // yyyy-mm-dd
  const start = new Date(`${day}T00:00:00+05:30`);
  const end = new Date(`${day}T23:59:59.999+05:30`);
  return { day, start, end };
}

async function safeGetSession(headers: Headers) {
  const hdrObj: Record<string, string> = {};
  for (const [k, v] of Array.from(headers.entries())) hdrObj[k] = v;
  const cookie = headers.get("cookie") ?? "";
  try {
    if (cookie) {
      const s = await auth.api.getSession?.({ cookie } as any);
      if (s) return { ok: true, session: s };
    }
  } catch (e: any) {}
  try {
    const s = await auth.api.getSession?.({ headers: hdrObj } as any);
    if (s) return { ok: true, session: s };
  } catch (e: any) {}
  return { ok: false };
}

export async function GET(request: Request) {
  // allow optional query userId (for admin/testing), otherwise prefer session user
  const url = new URL(request.url);
  const qUserId = url.searchParams.get("userId");

  const { ok, session } = await safeGetSession(request.headers);

  const userId = qUserId ?? (ok && session?.user?.id ? session.user.id : null);
  if (!userId) return NextResponse.json({ error: "Unauthorized (no user id)" }, { status: 401 });

  try {
    // 1) total credits (all time)
    const creditsRows = await db
      .select({ credits: mood.credits })
      .from(mood)
      .where(eq(mood.userId, userId));
    const totalCredits = creditsRows.reduce((s, r) => s + (Number(r.credits) || 0), 0);

    // 2) last N days entries (we'll fetch last 30 days to compute streak)
    const todayK = kolkataDayKey(new Date());
    const thirtyDaysAgo = new Date(todayK.start);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29); // include today => 30 days window

    // Use SQL expression for date comparison (type-safe across Drizzle versions)
    const rows = await db
      .select()
      .from(mood)
      .where(and(eq(mood.userId, userId), sql`${mood.createdAt} >= ${thirtyDaysAgo}`))
      .orderBy(desc(mood.createdAt));

    // Build set of day keys that have at least one entry (use latest per day isn't necessary for streak)
    const daySet = new Set<string>();
    const dayLatestMap = new Map<string, number>(); // map day -> latest timestamp (ms)
    for (const r of rows) {
      const { day } = kolkataDayKey(new Date(r.createdAt));
      daySet.add(day);
      const prev = dayLatestMap.get(day) ?? 0;
      const ts = new Date(r.createdAt).getTime();
      if (ts > prev) dayLatestMap.set(day, ts);
    }

    // compute streak: number of consecutive days up to today with entries
    let streak = 0;
    for (let i = 0;; i++) {
      const d = new Date(todayK.start);
      d.setDate(d.getDate() - i);
      const dk = kolkataDayKey(d).day;
      if (daySet.has(dk)) streak++;
      else break;
      if (i > 60) break; // safety cap
    }

    // 3) past week (7 days) list: for each day, pick the latest moodScore for that day or null
    const pastWeek: Array<{ date: string; moodScore: number | null }> = [];
    const sevenAgo = new Date(todayK.start);
    sevenAgo.setDate(sevenAgo.getDate() - 6); // 6 days ago + today = 7 days
    // filter rows in last 7 days
    const rows7 = rows.filter((r) => new Date(r.createdAt) >= sevenAgo);

    // build latest-per-day map for last 7 days
    const latestPerDay = new Map<string, { score: number; ts: number }>();
    for (const r of rows7) {
      const kd = kolkataDayKey(new Date(r.createdAt)).day;
      const ts = new Date(r.createdAt).getTime();
      const existing = latestPerDay.get(kd);
      if (!existing || ts > existing.ts) latestPerDay.set(kd, { score: Number(r.moodScore ?? 3), ts });
    }
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayK.start);
      d.setDate(d.getDate() - i);
      const dk = kolkataDayKey(d).day;
      const entry = latestPerDay.get(dk);
      pastWeek.push({ date: dk, moodScore: entry ? entry.score : null });
    }

    // 4) distribution: counts of scores 1..5 in the past week (change window if you want all-time)
    const distribution: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    for (const v of latestPerDay.values()) {
      const s = Math.max(1, Math.min(5, Math.round(v.score)));
      distribution[String(s)] = (distribution[String(s)] ?? 0) + 1;
    }

    return NextResponse.json({
      totalCredits,
      streak,
      pastWeek,
      distribution,
    });
  } catch (e: any) {
    console.error("mood stats error:", e);
    return NextResponse.json({ error: "Failed to compute stats", details: String(e) }, { status: 500 });
  }
}
