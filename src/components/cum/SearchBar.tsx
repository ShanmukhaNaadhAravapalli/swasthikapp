// src/components/cum/SearchBar.tsx
"use client";

import React, { useRef, useEffect } from "react";
import { Search, X } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onClear?: () => void;
  placeholder?: string;
};

export default function SearchBar({ value, onChange, onClear, placeholder = "Search #hashtag or text" }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  // focus input when mount (nice UX when user taps Search nav)
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-full">
        <div className="flex items-center gap-3 bg-[#111111] border border-gray-700 rounded-full px-3 py-2 shadow-sm">
          <Search size={18} className="text-gray-400" />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-500 outline-none"
            aria-label="Search posts"
          />
          {value ? (
            <button
              onClick={() => {
                onClear?.();
                onChange("");
                inputRef.current?.focus();
              }}
              className="p-1 rounded-full hover:bg-white/5 transition"
              aria-label="Clear search"
            >
              <X size={16} className="text-gray-400" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
