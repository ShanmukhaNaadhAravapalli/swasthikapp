// src/components/cum/notifications-panel.tsx
"use client";

import React, { useEffect, useState } from "react";

type Notification = {
  id: string;
  type: string;
  actor_name: string;
  post_content?: string;
  created_at: string;
  read?: boolean;
};

export default function NotificationsPanel({
  clientUserId,
  providerUserId,
  pollInterval = 6000,
  onOpenNotification,
}: {
  clientUserId?: string | null;
  providerUserId?: string | null;
  pollInterval?: number;
  onOpenNotification?: (n: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const q = providerUserId ? `?provider_user_id=${encodeURIComponent(providerUserId)}` : clientUserId ? `?userId=${encodeURIComponent(clientUserId)}` : "";
      const res = await fetch(`/api/notifications${q}`);
      const j = await res.json();
      const list = Array.isArray(j?.notifications) ? j.notifications : [];
      setNotifications(list);
      setUnreadCount(list.filter((n: any) => !n.read).length);
    } catch (err) {
      console.error("notifications load error", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, pollInterval);
    return () => clearInterval(t);
  }, [clientUserId, providerUserId, pollInterval]);

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load(); // refresh when opening
        }}
        className="relative"
        aria-label="Notifications"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-gray-200">
          <path d="M15 17H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="origin-top-right absolute right-0 mt-2 w-96 max-h-[60vh] overflow-y-auto bg-[#0b0b0b] border border-gray-800 rounded-lg shadow-lg p-3 z-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-100">Alerts</h4>
            <button className="text-sm text-gray-400" onClick={() => { setOpen(false); }}>Close</button>
          </div>

          {loading && <div className="text-sm text-gray-400">Loading…</div>}
          {!loading && notifications.length === 0 && <div className="text-sm text-gray-400">No notifications yet.</div>}

          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className="p-3 rounded border border-gray-800 bg-[#0f0f10]">
                <div className="text-sm text-gray-200">
                  <strong>{n.actor_name}</strong> {n.type === "like" ? "liked" : n.type === "support" ? "supported" : n.type} your post
                </div>
                {n.post_content ? <div className="text-xs text-gray-400 mt-1 line-clamp-2">{n.post_content}</div> : null}
                <div className="text-xs text-gray-500 mt-2">{new Date(n.created_at).toLocaleString()}</div>
                <div className="mt-2 flex gap-2">
                  <button className="text-xs text-indigo-400" onClick={() => onOpenNotification?.(n)}>Open</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
