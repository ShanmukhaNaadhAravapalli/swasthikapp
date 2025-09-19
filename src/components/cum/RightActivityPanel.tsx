// components/cum/RightActivityPanel.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Brush,
} from "recharts";

type ActionItem = {
  kind: "like" | "support" | "comment";
  id: string;
  post_id?: string | null;
  post_excerpt?: string | null;
  comment_snippet?: string | null;
  created_at: string;
};

export default function RightActivityPanel({
  userId,
  days = 30,
}: {
  userId?: string | null;
  days?: number;
}) {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"daily" | "weekly">("daily");

  useEffect(() => {
    if (!userId) {
      setActions([]);
      setChartData([]);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const res = await fetch(
          `/api/activity/outgoing?userId=${encodeURIComponent(String(userId))}&limit=80`,
          { signal: ac.signal }
        );
        if (!res.ok) throw new Error("failed to load actions");
        const j = await res.json();
        setActions(Array.isArray(j?.actions) ? j.actions : []);

        const r2 = await fetch(
          `/api/stats/outgoing?userId=${encodeURIComponent(String(userId))}&days=${days}`,
          { signal: ac.signal }
        );
        if (r2.ok) {
          const rows = await r2.json();
          const raw = Array.isArray(rows) ? rows : Array.isArray(rows?.data) ? rows.data : [];
          setChartData(raw ?? []);
        } else {
          setChartData([]);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error(err);
        setError(String(err?.message ?? err));
        setChartData([]);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => ac.abort();
  }, [userId, days]);

  const normalized = useMemo(() => {
    if (!Array.isArray(chartData)) return [];
    const arr = chartData
      .map((r: any) => {
        const maybeDate = String(r.date ?? r.day ?? "").trim();
        return {
          date: maybeDate,
          likes: Number(r.likes ?? 0) || 0,
          supports: Number(r.supports ?? 0) || 0,
          comments: Number(r.comments ?? 0) || 0,
        };
      })
      .filter((r: any) => {
        if (!r.date) return false;
        const parsed = Date.parse(r.date);
        return !Number.isNaN(parsed);
      })
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return arr;
  }, [chartData]);

  const aggregated = useMemo(() => {
    if (mode === "daily") return normalized;
    const weekMap = new Map<string, { date: string; likes: number; supports: number; comments: number }>();
    normalized.forEach((row) => {
      const d = new Date(row.date + "T00:00:00Z");
      const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
      const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      const key = `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
      if (!weekMap.has(key)) {
        const day = new Date(d);
        const dayOfWeek = (day.getUTCDay() + 6) % 7;
        const mon = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() - dayOfWeek));
        weekMap.set(key, { date: mon.toISOString().slice(0, 10), likes: 0, supports: 0, comments: 0 });
      }
      const cur = weekMap.get(key)!;
      cur.likes += row.likes;
      cur.supports += row.supports;
      cur.comments += row.comments;
    });
    const out = Array.from(weekMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return out;
  }, [normalized, mode]);

  const display = aggregated;

  function shortDateLabel(d: string) {
    try {
      const dt = new Date(d + "T00:00:00Z");
      return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return d;
    }
  }

  const brushStartIndex = Math.max(0, display.length - Math.min(display.length, 20));
  const brushEndIndex = Math.max(0, display.length - 1);

  return (
    <div className="bg-[#0e0e10] border border-gray-800 rounded-lg p-2">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold">Your activity</h4>
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-400 mr-1">View</div>
          <div className="inline-flex bg-[#0b0b0b] rounded-md p-1 border border-gray-800" role="tablist" aria-label="View mode">
            <button
              aria-pressed={mode === "daily"}
              className={`text-xs px-2 py-1 rounded-md ${mode === "daily" ? "bg-gray-700 text-white" : "text-gray-300"}`}
              onClick={() => setMode("daily")}
            >
              Daily
            </button>
            <button
              aria-pressed={mode === "weekly"}
              className={`text-xs px-2 py-1 rounded-md ${mode === "weekly" ? "bg-gray-700 text-white" : "text-gray-300"}`}
              onClick={() => setMode("weekly")}
            >
              Weekly
            </button>
          </div>
        </div>
      </div>

      <div className="max-h-40 overflow-y-auto mb-3">
        {loading ? (
          <div className="text-sm text-gray-400 p-2">Loading…</div>
        ) : actions.length === 0 ? (
          <div className="text-xs text-gray-500 p-2">No recent activity</div>
        ) : (
          actions.slice(0, 6).map((a) => (
            <div key={a.kind + "-" + a.id} className="p-2 border-b border-gray-800 text-sm">
              <div className="flex justify-between items-start">
                <div className="pr-2">
                  {a.kind === "like" && <div><strong>You</strong> liked a post</div>}
                  {a.kind === "support" && <div><strong>You</strong> supported a post</div>}
                  {a.kind === "comment" && <div><strong>You</strong> commented</div>}
                  <div className="text-xs text-gray-400 mt-1 line-clamp-2">{a.comment_snippet ?? a.post_excerpt ?? ""}</div>
                </div>
                <div className="text-xs text-gray-500 ml-2">{new Date(a.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-2">
        <h5 className="text-xs font-medium text-gray-300 mb-2">{mode === "daily" ? "Daily" : "Weekly"} actions (last {days} days)</h5>
        {error ? (
          <div className="text-xs text-red-500">{error}</div>
        ) : (
          <div style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer>
              <AreaChart data={display} margin={{ top: 4, right: 8, left: -6, bottom: 8 }}>
                <defs>
                  <linearGradient id="gLikes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0.06} />
                  </linearGradient>
                  <linearGradient id="gSupports" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.06} />
                  </linearGradient>
                  <linearGradient id="gComments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#facc15" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#facc15" stopOpacity={0.06} />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke="#111" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#cbd5e1" }}
                  tickFormatter={(t) => shortDateLabel(String(t))}
                  interval={Math.max(0, Math.floor(display.length / 6))}
                />
                <YAxis tick={{ fontSize: 10, fill: "#cbd5e1" }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#0b0b0b", borderColor: "#222" }} labelFormatter={(lbl) => `Date: ${String(lbl)}`} />
                <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
                <Area type="monotone" dataKey="likes" name="Likes" stroke="#10b981" fill="url(#gLikes)" fillOpacity={1} dot={false} />
                <Area type="monotone" dataKey="supports" name="Supports" stroke="#3b82f6" fill="url(#gSupports)" fillOpacity={1} dot={false} />
                <Area type="monotone" dataKey="comments" name="Comments" stroke="#f59e0b" fill="url(#gComments)" fillOpacity={1} dot={false} />

                {display.length > 0 && (
                  <Brush
                    dataKey="date"
                    height={20}
                    stroke="#374151"
                    travellerWidth={8}
                    startIndex={brushStartIndex}
                    endIndex={brushEndIndex}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
