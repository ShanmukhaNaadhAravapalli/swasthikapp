// components/ui/main_features.tsx
"use client";

import React from "react";
import { Calendar, Users,BrainCircuit, Bot } from "lucide-react";
import Link from "next/link";

export default function LearningProgressCards() {
  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Personal Assistant */}
      <div className="p-4 rounded-2xl shadow-sm border border-gray-800 bg-[#1F1F1F]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-800 text-white">
            <Bot size={18} />
          </div>
          <div>
            <div className="text-sm text-white font-medium">Personal Assistant</div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <Link
              href="/dashboard/personal-assist"
              className="text-xs px-3 py-1 rounded-full border border-gray-700 text-gray-200 hover:bg-gray-800">
            Continue
          </Link>
          <button className="text-xs px-3 py-1 rounded-full bg-white/5 text-green-700">
            Ongoing
          </button>
        </div>
      </div>

      {/* Community Support */}
      <div className="p-4 rounded-2xl shadow-sm border border-gray-800 bg-[#1F1F1F]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-800 text-white">
            <Users size={18} />
          </div>
          <div>
            <div className="text-sm text-white font-medium">Community Support</div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <Link
              href="/dashboard/community"
              className="text-xs px-3 py-1 rounded-full border border-gray-700 text-gray-200 hover:bg-gray-800">
            Continue
          </Link>
          <button className="text-xs px-3 py-1 rounded-full bg-white/5 text-green-700">
            Ongoing
          </button>
        </div>
      </div>

      {/* Events */}
      <div className="p-4 rounded-2xl shadow-sm border border-gray-800 bg-[#1F1F1F]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-800 text-white">
            <BrainCircuit size={18} />
          </div>
          <div>
            <div className="text-sm text-white font-medium">Exercises</div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <Link
              href="/dashboard/exercise"
              className="text-xs px-3 py-1 rounded-full border border-gray-700 text-gray-200 hover:bg-gray-800">
            Continue
          </Link>
          <button className="text-xs px-3 py-1 rounded-full bg-white/5 text-green-700">
            Ongoing
          </button>
        </div>
      </div>

      {/* AI Agent Booking */}
      <div className="p-4 rounded-2xl shadow-sm border border-gray-800 bg-[#1F1F1F]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-800 text-white">
            <Calendar size={18} />
          </div>
          <div>
            <div className="text-sm text-white font-medium">AI Agent Booking</div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <Link
      href="/dashboard/booking"
      className="text-xs px-3 py-1 rounded-full border border-gray-700 text-gray-200 hover:bg-gray-800"
    >
      Continue
    </Link>
          <button className="text-xs px-3 py-1 rounded-full bg-white/5 text-yellow-200">
            Pending
          </button>
        </div>
      </div>
    </div>
  );
}