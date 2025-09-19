// components/ActivityChart.tsx
"use client";
import React, { useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from "recharts";

type Row = { date: string; likes: number; supports: number; comments: number };

export default function ActivityChart({ userId, days = 30 }: { userId?: string; days?: number }) {
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setData([]);
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/stats/activity?userId=${encodeURIComponent(userId)}&days=${days}`, { signal: ac.signal })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Failed to fetch");
        }
        return res.json();
      })
      .then((rows: Row[] | { data: Row[] }) => {
        const normalized = Array.isArray(rows) ? rows : Array.isArray((rows as any).data) ? (rows as any).data : [];
        setData(normalized);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        console.error("ActivityChart fetch error:", err);
        setError(String(err?.message ?? err));
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, [userId, days]);

  if (loading) return <div className="p-3 bg-white border rounded shadow-sm">Loading chart...</div>;
  if (error) return <div className="p-3 bg-white border rounded shadow-sm text-red-600">Error: {error}</div>;

  return (
    <div className="p-3 bg-white border rounded shadow-sm w-full">
      <h4 className="text-sm font-semibold mb-2">Activity (last {days} days)</h4>
      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="likes" name="Likes" dot={false} />
            <Line type="monotone" dataKey="supports" name="Supports" dot={false} />
            <Line type="monotone" dataKey="comments" name="Comments" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
