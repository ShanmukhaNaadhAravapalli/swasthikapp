// components/assist/RightNotePanel.tsx
"use client";
import React from "react";

export default function RightNotePanel({
  items = [],
  onClear,
}: {
  items?: { id: string; title?: string; note?: string }[];
  onClear?: () => void;
}) {
  return (
    <div className="bg-transparent border border-white/6 rounded-lg p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold">Session Notes</h4>
        <button onClick={onClear} className="text-xs text-gray-400 hover:text-gray-200">Clear</button>
      </div>

      <div className="space-y-2 max-h-[56vh] overflow-y-auto pr-2">
        {items.length === 0 ? (
          <div className="text-xs text-gray-400">No saved notes — start a session to capture highlights.</div>
        ) : (
          items.map((it) => (
            <div key={it.id} className="p-2 rounded-md bg-white/3 border border-white/6">
              <div className="text-sm font-medium">{it.title ?? "Note"}</div>
              <div className="text-xs text-gray-200 mt-1 line-clamp-3">{it.note}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
