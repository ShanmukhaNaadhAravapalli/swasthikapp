"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import LumaBar from "@/components/cum/futuristic-nav";
import { Button } from "@/components/cum/button";
import { Plus, X } from "lucide-react";
import ComposeModalDark from "@/components/cum/ComposeModalDark";
import PostList from "@/components/cum/post-list";
import SearchBar from "@/components/cum/SearchBar";
import CommentsPanel from "@/components/cum/comments-panel";
import RightActivityPanel from "@/components/cum/RightActivityPanel";
import type { Post } from "@/components/cum/post-card";

type NotificationRow = {
  id: string;
  actor_user_id?: string | null;
  actor_display_name?: string | null;
  type: string;
  post_id?: string | null;
  comment_id?: string | null;
  read?: boolean;
  created_at?: string;
};

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<string>("home");
  const [composeOpen, setComposeOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState<string>("");
  const [activeCommentsFor, setActiveCommentsFor] = useState<string | null>(null);

  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  const [clientUserId, setClientUserId] = useState<string | null>(null);

  // notifications state (polled)
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [blink, setBlink] = useState(false);
  const prevUnread = useRef<number>(0);

  // activity panel visibility (right-side drawer)
  const [showActivityPanel, setShowActivityPanel] = useState<boolean>(false);

  useEffect(() => {
    try {
      let id = localStorage.getItem("clientProviderId");
      if (!id) {
        id =
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `dev-user-${Date.now()}`;
        localStorage.setItem("clientProviderId", id);
      }
      try {
        localStorage.setItem("clientUserId", id);
      } catch {}
      setClientUserId(id);
    } catch {
      setClientUserId(null);
    }
  }, []);

  // load feed
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/posts/feed");
        const ct = res.headers.get("content-type") || "";
        if (!res.ok || !ct.includes("application/json")) throw new Error("feed json not available");
        const j = await res.json();
        const incoming = Array.isArray(j) ? j : j?.posts ?? [];
        if (mounted) setPosts(incoming);
      } catch (err) {
        console.warn("feed load failed", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // notifications poll
  useEffect(() => {
    let mounted = true;
    const provider = typeof window !== "undefined" ? localStorage.getItem("clientProviderId") : null;
    const qbase = provider
      ? `?provider_user_id=${encodeURIComponent(provider)}`
      : clientUserId
      ? `?userId=${encodeURIComponent(clientUserId)}`
      : "";

    async function fetchNotifs() {
      try {
        const res = await fetch(`/api/notifications${qbase}`);
        if (!res.ok) return;
        const j = await res.json();
        if (!mounted) return;
        const n = Array.isArray(j?.notifications) ? j.notifications : [];
        const u = typeof j?.unreadCount === "number" ? j.unreadCount : n.filter((a: any) => !a.read).length;
        if (u > (prevUnread.current ?? 0)) {
          setBlink(true);
          setTimeout(() => setBlink(false), 1200);
        }
        prevUnread.current = u;
        setNotifications(n);
        setUnreadCount(u);
      } catch (e) {
        // ignore
      }
    }

    fetchNotifs();
    const id = setInterval(fetchNotifs, 8000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [clientUserId]);

  // nav handler: note index mapping: 0 home, 1 search, 2 alerts, 4 saved
  function handleNav(index: number) {
    if (index === 0) {
      setActiveTab("home");
      setQuery("");
      setShowActivityPanel(false);
    } else if (index === 1) {
      setActiveTab("search");
      setShowActivityPanel(false);
    } else if (index === 2) {
      // open alerts tab AND open right-side activity drawer
      setActiveTab("alerts");
      setShowActivityPanel(true);
    } else if (index === 4) {
      setActiveTab("saved");
      setShowActivityPanel(false);
    } else {
      setActiveTab("other");
      setQuery("");
      setShowActivityPanel(false);
    }
  }

  function handleCreated(post: any) {
    const normalized: Post = {
      id: post.id ?? `p-${Date.now()}`,
      content: post.content ?? String(post),
      created_at: post.created_at ?? new Date().toISOString(),
      attachments: post.attachments ?? [],
      likes: post.likes ?? 0,
      supports: post.supports ?? 0,
      commentsCount: post.commentsCount ?? 0,
      is_anonymous: post.is_anonymous ?? true,
      author: post.is_anonymous ? { name: "Anonymous" } : post.user ? { name: String(post.user) } : { name: "You" },
    };
    setPosts((prev) => [normalized, ...prev]);
  }

  // like handler
  async function handleLike(postId: string) {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, likes: (p.likes ?? 0) + 1 } : p)));
    try {
      const provider = typeof window !== "undefined" ? localStorage.getItem("clientProviderId") : null;
      const res = await fetch("/api/posts/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, provider_user_id: provider ?? clientUserId ?? null }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, likes: Math.max(0, (p.likes ?? 1) - 1) } : p)));
        return;
      }
      if (typeof j.likesCount === "number") {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, likes: j.likesCount } : p)));
      }
      setTimeout(() => {
        /* allow poll to pick up notification */
      }, 150);
    } catch (err) {
      console.error(err);
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, likes: Math.max(0, (p.likes ?? 1) - 1) } : p)));
    }
  }

  // support handler
  async function handleSupport(postId: string) {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, supports: (p.supports ?? 0) + 1 } : p)));
    try {
      const provider = typeof window !== "undefined" ? localStorage.getItem("clientProviderId") : null;
      const res = await fetch("/api/posts/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, provider_user_id: provider ?? clientUserId ?? null }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, supports: Math.max(0, (p.supports ?? 1) - 1) } : p)));
        return;
      }
      if (typeof j.supportsCount === "number") {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, supports: j.supportsCount } : p)));
      }
      setTimeout(() => {}, 150);
    } catch (err) {
      console.error(err);
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, supports: Math.max(0, (p.supports ?? 1) - 1) } : p)));
    }
  }

  // save handler (keeps saved posts)
  async function handleSave(postId: string) {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, saved: !(p.saved ?? false) } : p)));
    try {
      const provider = typeof window !== "undefined" ? localStorage.getItem("clientProviderId") : null;
      const res = await fetch("/api/posts/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, provider_user_id: provider ?? clientUserId ?? null, display_name: "You" }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, saved: !(p.saved ?? false) } : p)));
        return;
      }
      const saved = !!j?.saved;
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, saved } : p)));
      if (saved) {
        setSavedPosts((prev) => {
          if (prev.some((s) => s.id === postId)) return prev;
          const found = posts.find((p) => p.id === postId);
          return found ? [{ ...found, saved: true }, ...prev] : prev;
        });
      } else {
        setSavedPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    } catch (err) {
      console.error(err);
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, saved: !(p.saved ?? false) } : p)));
    }
  }

  function openComments(postId: string) {
    setActiveCommentsFor(postId);
  }
  function closeComments() {
    setActiveCommentsFor(null);
  }

  // Fetch saved posts when the Saved tab is opened or when provider id changes
  useEffect(() => {
    let mounted = true;
    async function loadSaved() {
      setLoadingSaved(true);
      try {
        const provider = typeof window !== "undefined" ? localStorage.getItem("clientProviderId") : null;
        if (!provider) {
          if (mounted) setSavedPosts([]);
          return;
        }
        const res = await fetch(`/api/posts/saved?provider_user_id=${encodeURIComponent(provider)}`);
        if (!res.ok) throw new Error("saved fetch failed");
        const j = await res.json();
        if (!mounted) return;
        const incoming = Array.isArray(j) ? j : j?.posts ?? [];
        setSavedPosts(incoming);
      } catch (err) {
        console.warn("failed to load saved posts", err);
        if (mounted) setSavedPosts([]);
      } finally {
        if (mounted) setLoadingSaved(false);
      }
    }

    if (activeTab === "saved") loadSaved();
    return () => {
      mounted = false;
    };
  }, [activeTab, clientUserId]);

  const filteredPosts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    if (q.startsWith("#")) {
      const tag = q.slice(1);
      return posts.filter((p) =>
        (p.content ?? "")
          .toLowerCase()
          .split(/\s+/)
          .some((w) => w.replace(/[^a-z0-9#_-]/gi, "").includes(`#${tag}`) || w.includes(tag))
      );
    }
    return posts.filter((p) => (p.content ?? "").toLowerCase().includes(q));
  }, [posts, query]);

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-gray-100 relative overflow-hidden overflow-x-hidden">
      <main className="w-full flex justify-center">
        <section
          className="w-full"
          style={{ maxWidth: "var(--nav-width, 750px)", height: "calc(100vh - var(--nav-height, 84px) - 40px)" }}
        >
          <div className="sticky top-0 z-30 bg-[#0b0b0b] border-b border-gray-800">
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">
                  {activeTab === "search"
                    ? "Search"
                    : activeTab === "saved"
                    ? "Saved"
                    : activeTab === "alerts"
                    ? "Alerts"
                    : "Community"}
                </h2>
                <p className="text-sm text-gray-400">
                  {activeTab === "search"
                    ? "Search posts and hashtags"
                    : activeTab === "saved"
                    ? "Posts you've saved"
                    : activeTab === "alerts"
                    ? "Your alerts"
                    : "Peer support — be kind and supportive."}
                </p>
              </div>
              <div /> {/* no top-right bell */}
            </div>

            {activeTab === "search" && (
              <div className="px-4 pb-3 pt-2">
                <SearchBar value={query} onChange={(v) => setQuery(v)} onClear={() => setQuery("")} />
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto hide-scrollbar" style={{ height: "calc(100% - 56px)", paddingBottom: "var(--nav-height, 84px)" }}>
            {activeTab === "home" ? (
              loading ? (
                <div className="p-6 text-center text-gray-400">Loading feed…</div>
              ) : posts.length === 0 ? (
                <div className="p-6 text-center text-gray-400">No posts yet — be the first to share.</div>
              ) : (
                <div className="py-6 px-4">
                  <PostList
                    posts={posts}
                    onLike={handleLike}
                    onSupport={handleSupport}
                    onOpenComments={openComments}
                    clientUserId={clientUserId}
                    onSave={handleSave}
                  />
                </div>
              )
            ) : activeTab === "search" ? (
              <div className="py-6 px-4">
                {loading ? (
                  <div className="p-6 text-center text-gray-400">Loading…</div>
                ) : filteredPosts.length === 0 ? (
                  <div className="text-center text-gray-400">No results found.</div>
                ) : (
                  <PostList
                    posts={filteredPosts}
                    onLike={handleLike}
                    onSupport={handleSupport}
                    onOpenComments={openComments}
                    clientUserId={clientUserId}
                    onSave={handleSave}
                  />
                )}
              </div>
            ) : activeTab === "saved" ? (
              <div className="py-6 px-4">
                {loadingSaved ? (
                  <div className="p-6 text-center text-gray-400">Loading saved…</div>
                ) : savedPosts.length === 0 ? (
                  <div className="text-center text-gray-400">No saved posts yet.</div>
                ) : (
                  <PostList
                    posts={savedPosts}
                    onLike={handleLike}
                    onSupport={handleSupport}
                    onOpenComments={openComments}
                    clientUserId={clientUserId}
                    onSave={handleSave}
                  />
                )}
              </div>
            ) : activeTab === "alerts" ? (
              <div className="py-6 px-4">
                {notifications.length === 0 ? (
                  <div className="text-center text-gray-400">No notifications yet.</div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((n) => (
                      <div key={n.id} className="p-3 rounded-lg bg-[#0e0e10] border border-gray-800">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-sm text-gray-200">
                              {n.type === "like" && (
                                <>
                                  <strong>{n.actor_display_name ?? "Someone"}</strong> liked your post
                                </>
                              )}
                              {n.type === "support" && (
                                <>
                                  <strong>{n.actor_display_name ?? "Someone"}</strong> supported your post
                                </>
                              )}
                              {n.type === "comment" && (
                                <>
                                  <strong>{n.actor_display_name ?? "Someone"}</strong> commented on your post
                                </>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{n.post_id ? `Post: ${n.post_id}` : ""}</div>
                          </div>
                          <div className="text-xs text-gray-400">{new Date(n.created_at ?? "").toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-gray-300">This section is {activeTab} (not implemented yet)</div>
            )}
          </div>
        </section>
      </main>

      <LumaBar position="bottom" onNavigate={handleNav} notificationsCount={unreadCount} blinkNotifications={blink} />

      <div style={{ left: "50%", transform: "translateX(calc(-50% + 300px)) translateY(calc(-50% + 50px))" }} className="fixed z-50 bottom-32">
        <Button className="rounded-full shadow-lg w-16 h-16 flex items-center justify-center" variant="outline" size="icon" aria-label="Add new post" onClick={() => setComposeOpen(true)}>
          <Plus size={20} strokeWidth={2} aria-hidden="true" />
        </Button>
      </div>

      <ComposeModalDark open={composeOpen} onClose={() => setComposeOpen(false)} onCreated={handleCreated} />

      {activeCommentsFor && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-3xl">
            <CommentsPanel
              postId={activeCommentsFor}
              clientUserId={clientUserId}
              onCommentCreated={(comment, newCount) => {
                setPosts((prev) => prev.map((p) => (p.id === activeCommentsFor ? { ...p, commentsCount: newCount } : p)));
              }}
              onClose={closeComments}
            />
          </div>
        </div>
      )}

      {/* Right-side activity panel (drawer) */}
      {/* Backdrop */}
      {showActivityPanel && (
        <div
          className="fixed inset-0 z-40"
          aria-hidden="true"
          onClick={() => setShowActivityPanel(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        </div>
      )}

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-[360px] max-w-full transform bg-transparent transition-transform duration-300 ease-out ${showActivityPanel ? "translate-x-0" : "translate-x-full"}`}
        aria-hidden={!showActivityPanel}
      >
        <div className="h-full flex flex-col">
          <div className="p-3 border-l border-gray-800 bg-[#071014] h-full">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Your activity</h3>
              <button
                aria-label="Close activity panel"
                onClick={() => setShowActivityPanel(false)}
                className="text-gray-300 hover:text-white p-1 rounded"
              >
                <X size={18} />
              </button>
            </div>

            {/* Pass clientUserId (provider id) as userId for the activity panel */}
            <div style={{ height: "calc(100% - 44px)", overflow: "auto" }}>
              <RightActivityPanel userId={clientUserId} days={30} />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
