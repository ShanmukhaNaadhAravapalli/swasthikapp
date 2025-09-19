// components/MoodStatsCard.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar,
} from "recharts";

interface PastDay { date: string; moodScore: number | null }
interface StatsRes {
  totalCredits: number;
  streak: number;
  pastWeek: PastDay[];
  distribution: Record<string, number>;
}

const formatShortDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00+05:30`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const MoodStatsCard: React.FC<{ userId: string }> = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsRes | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [activeChart, setActiveChart] = useState(0); // 0 = line, 1 = bar
  const slides = 2;
  const sliderRef = useRef<HTMLDivElement | null>(null);

  // Simple touch support
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/mood/stats?userId=${encodeURIComponent(userId)}`, { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setStats(json);
      } catch (e: any) {
        if (!cancelled) setError(String(e));
      } finally { if (!cancelled) setLoading(false); }
    }
    fetchStats();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) return <div className="w-full p-4 bg-[#232323] rounded-xl text-white">Loading stats…</div>;
  if (error || !stats) return <div className="w-full p-4 bg-[#232323] rounded-xl text-white">Error loading stats: {error}</div>;

  const lineData = stats.pastWeek.map(p => ({
    date: p.date,
    label: formatShortDate(p.date),
    score: p.moodScore,
  }));

  const barData = [1,2,3,4,5].map(n => ({ score: n, count: stats.distribution[String(n)] ?? 0 }));

  const goPrev = () => setActiveChart(c => Math.max(0, c - 1));
  const goNext = () => setActiveChart(c => Math.min(slides - 1, c + 1));
  const goTo = (idx: number) => setActiveChart(() => Math.max(0, Math.min(slides - 1, idx)));

  // Touch handlers (simple threshold)
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };
  const onTouchEnd = () => {
    const delta = touchDeltaX.current;
    const threshold = 40; // px
    if (delta > threshold) {
      goPrev();
    } else if (delta < -threshold) {
      goNext();
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  return (
    <div className="w-full bg-[#1f1f1f] rounded-xl p-4 text-white shadow-md">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs text-gray-300">Streak</div>
          <div className="text-2xl font-semibold">{stats.streak} <span className="text-sm text-gray-400">days</span></div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-300">Credits</div>
          <div className="text-2xl font-semibold">{stats.totalCredits}</div>
        </div>
      </div>

      {/* Carousel area */}
      <div className="relative">
        {/* Slider viewport */}
        <div
          className="w-full overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Slider track: width = slides * 100% */}
          <div
            ref={sliderRef}
            className="flex transition-transform duration-300 ease-in-out"
            style={{ width: `${slides * 100}%`, transform: `translateX(-${(activeChart * 100) / slides}%)` }}
          >
            {/* Slide 0: Line chart */}
            <div className="w-full" style={{ flex: `0 0 ${100 / slides}%` }}>
              <div className="bg-[#111] rounded-lg p-3">
                <div className="text-sm text-gray-300 mb-2">Last 7 days</div>
                <div style={{ width: "100%", height: "200px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    {/*
                      To make axes (and the plotted line) appear flush with the left edge we:
                      1) remove any extra wrapper padding (done in component layout)
                      2) keep chart margin.left = 0
                      3) use scale="point" with zero padding so category points map to edges
                      4) *shift the plotting area slightly left* using a small negative left margin when
                         the card's inner padding (p-3) visually pushes the axis inward.
                      The negative margin is a small visual nudge (usually -6 to -12px) that aligns the
                      axis line with the card inner edge while preserving the label/tooltip layout.
                    */}
                    <LineChart
                      data={lineData}
                      // small negative left margin aligns axis with card edge (adjust if needed)
                      margin={{ top: 10, right: 0, left: -15, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />

                      <XAxis
                        dataKey="label"
                        type="category"
                        scale="point"
                        padding={{ left: 0, right: 0 }}
                        interval={0}
                        tick={{ fontSize: 12 }}
                        stroke="#666"
                        axisLine={true}
                        tickMargin={6}
                      />

                      <YAxis
                        domain={[1,5]}
                        ticks={[1,2,3,4,5]}
                        tick={{ fontSize: 12 }}
                        stroke="#666"
                        axisLine={true}
                        width={30}
                      />

                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#333', 
                          border: '1px solid #555',
                          borderRadius: '6px',
                          color: '#fff'
                        }}
                      />

                      <Line type="monotone" dataKey="score" stroke="#82ca9d" dot={{ r: 3 }} connectNulls={false} strokeWidth={2} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Slide 1: Bar chart */}
<div className="w-full" style={{ flex: `0 0 ${100 / slides}%` }}>
<div className="bg-[#111] rounded-lg p-3">
<div className="text-sm text-gray-300 mb-2">Scores distribution (past 7 days)</div>
<div style={{ width: "100%", height: "200px" }}>
<ResponsiveContainer width="100%" height="100%">
<BarChart data={barData} margin={{ top: 10, right: 0, left: 0, bottom: 10 }}>
<CartesianGrid strokeDasharray="3 3" stroke="#222" />
<XAxis dataKey="score" tick={{ fontSize: 12 }} stroke="#666" axisLine={false} />
<YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#666" axisLine={false} width={15} />
<Tooltip
  cursor={false}
  wrapperStyle={{
    backgroundColor: "transparent",
    boxShadow: "none",
    border: "none",
  }}
  contentStyle={{
    backgroundColor: "#555",   // or "transparent" if you prefer
    border: "1px solid #555",
    borderRadius: "6px",
    color: "#fff",
    padding: "8px",
  }}
  // header -> show descriptive label for the score (1..5)
  labelFormatter={(label: any) => {
    const map: Record<number, string> = {
      1: 'Very negative',
      2: 'Negative',
      3: 'Neutral',
      4: 'Positive',
      5: 'Very positive',
    };
    return map[Number(label)] ?? label;
  }}
  // value formatter -> show as "Days: X"
  formatter={(value: any, name: any) => {
    if (name === 'count') return [`${value}`, 'Days']; // will display: Days: 2
    return [value, name];
  }}
/>
<Bar dataKey="count" fill="#000000" radius={[2, 2, 0, 0]} />
</BarChart>
</ResponsiveContainer>
</div>
</div>
</div>
</div>
</div>
</div>

      {/* Dots navigation */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {Array.from({ length: slides }).map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Show slide ${i + 1}`}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
              i === activeChart 
                ? "bg-white scale-110" 
                : "bg-gray-600 hover:bg-gray-500"
            }`}
          />
        ))}
      </div>

      <div className="mt-3 text-sm text-gray-400 text-center">
        {activeChart === 0 ? "Showing: Last 7 days trend" : "Showing: Score distribution"}
      </div>
    </div>
  );
};

export default MoodStatsCard;
