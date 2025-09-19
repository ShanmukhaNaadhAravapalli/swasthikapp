"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Home, Search, Bell, User, Settings, Bookmark } from "lucide-react";

interface NavItem {
  id: number;
  icon: React.ReactNode;
  label: string;
}

const itemsBase: NavItem[] = [
  { id: 0, icon: <Home size={22} />, label: "Home" },
  { id: 1, icon: <Search size={22} />, label: "Search" },
  { id: 2, icon: <Bell size={22} />, label: "Alerts" },
  { id: 3, icon: <User size={22} />, label: "Profile" },
  { id: 4, icon: <Bookmark size={22} />, label: "Saved" },
  { id: 5, icon: <Settings size={22} />, label: "Settings" },
];

export default function LumaBar({
  position = "bottom",
  onNavigate,
  notificationsCount = 0,
  blinkNotifications = false,
}: {
  position?: "bottom" | "center";
  onNavigate?: (id: number) => void;
  notificationsCount?: number;
  blinkNotifications?: boolean;
}) {
  const [active, setActive] = useState(0);

  const containerPositionClass =
    position === "center"
      ? "fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      : "fixed left-1/2 bottom-6 -translate-x-1/2 z-50 pointer-events-auto";

  return (
    <div className={containerPositionClass} aria-hidden={false}>
      <div className="relative flex items-center justify-center gap-6 bg-black/40 backdrop-blur-md rounded-3xl px-10 py-3 shadow-xl border border-gray-800/40 overflow-hidden pointer-events-auto">
        <motion.div
          layoutId="active-indicator"
          className="absolute w-10 h-14 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-2xl -z-10"
          animate={{
            left: `calc(${active * (100 / itemsBase.length)}% + ${100 / itemsBase.length / 2}%)`,
            translateX: "-50%",
          }}
          transition={{ type: "spring", stiffness: 500, damping: 28 }}
        />

        {itemsBase.map((item, index) => {
          const isActive = index === active;
          const isBell = item.id === 2;
          return (
            <motion.div key={item.id} className="relative flex flex-col items-center group">
              <motion.button
                onClick={() => {
                  setActive(index);
                  onNavigate?.(index);
                }}
                whileHover={{ scale: 1.12 }}
                animate={{ scale: isActive ? 1.18 : 1 }}
                className={`flex items-center justify-center w-12 h-12 text-gray-200 hover:text-white relative z-10 rounded-md ${isActive ? "text-white" : "text-gray-300"}`}
                aria-pressed={isActive}
                aria-label={item.label}
                title={item.label}
              >
                {item.icon}
                {/* bell badge */}
                {isBell && notificationsCount > 0 && (
                  <span className="absolute -top-2 -right-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-xs font-semibold text-white z-20">
                    {notificationsCount > 99 ? "99+" : notificationsCount}
                  </span>
                )}
                {/* blink ring */}
                {isBell && blinkNotifications && (
                  <span className="absolute -inset-1 rounded-md ring-2 ring-red-500/60 animate-pulse z-0" />
                )}
              </motion.button>

              <span className="absolute bottom-full mb-2 px-2 py-1 text-xs rounded-md bg-gray-700 text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {item.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
