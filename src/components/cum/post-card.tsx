// src/components/cum/post-card.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Heart, Bookmark, Send, Image as ImageIcon } from "lucide-react";

export type Attachment = {
  id?: string;
  url?: string;       // preferred
  path?: string;      // some older rows might store path
  filename?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  uploaded_at?: string | null;
};

export type Post = {
  id: string;
  author?: { name?: string; handle?: string; avatarUrl?: string } | null;
  content: string;
  created_at?: string;
  // accept either array of URLs (legacy) or array of objects (current)
  attachments?: string[] | Attachment[];
  likes?: number;
  supports?: number;
  commentsCount?: number;
  is_anonymous?: boolean;
  saved?: boolean;
};

type PostCardProps = {
  post: Post;
  onOpenComments?: (postId: string) => void;
  clientUserId?: string | null;
  onNotificationsUpdated?: () => void;
  onSave?: (postId: string) => void;
};

export default function PostCard({
  post,
  onOpenComments,
  clientUserId,
  onNotificationsUpdated,
  onSave,
}: PostCardProps) {
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState<boolean>(post.saved ?? false);
  const [likesCount, setLikesCount] = useState<number>(post.likes ?? 0);
  const [supportsCount, setSupportsCount] = useState<number>(post.supports ?? 0);
  const [busyLike, setBusyLike] = useState(false);
  const [busySupport, setBusySupport] = useState(false);
  const [busySave, setBusySave] = useState(false);

  useEffect(() => setBookmarked(post.saved ?? false), [post.saved]);
  useEffect(() => setLikesCount(post.likes ?? 0), [post.likes]);
  useEffect(() => setSupportsCount(post.supports ?? 0), [post.supports]);

  // --- LIKE ---
  async function handleLike() {
    if (busyLike) return;
    setBusyLike(true);

    try {
      const provider = typeof window !== "undefined" ? localStorage.getItem("clientProviderId") : null;
      const res = await fetch("/api/posts/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          userId: clientUserId,
          provider_user_id: provider,
        }),
      });

      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setLiked(!!j.liked);
        setLikesCount(j.likesCount ?? 0);
        onNotificationsUpdated?.();
      } else {
        console.error("like error", j.error ?? j);
      }
    } catch (e) {
      console.error("like failed", e);
    } finally {
      setBusyLike(false);
    }
  }

  // --- SUPPORT ---
  async function handleSupport() {
    if (busySupport) return;
    setBusySupport(true);

    try {
      const provider = typeof window !== "undefined" ? localStorage.getItem("clientProviderId") : null;
      const res = await fetch("/api/posts/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          userId: clientUserId,
          provider_user_id: provider,
        }),
      });

      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setSupportsCount(j.supportsCount ?? 0);
        onNotificationsUpdated?.();
      } else {
        console.error("support error", j.error ?? j);
      }
    } catch (e) {
      console.error("support failed", e);
    } finally {
      setBusySupport(false);
    }
  }

  // --- SAVE ---
  function handleBookmarkClick() {
    if (busySave) return;
    setBookmarked((b) => !b);
    setBusySave(true);
    try {
      onSave?.(post.id);
    } catch (e) {
      setBookmarked((b) => !b);
      console.error("onSave threw", e);
    } finally {
      setTimeout(() => setBusySave(false), 250);
    }
  }

  const authorName = post.is_anonymous ? "Anonymous" : post.author?.name ?? "User";
  const authorHandle = post.is_anonymous ? "" : post.author?.handle ? `@${post.author?.handle}` : "";

  // Helper: get URL from attachment entry (string or object). Returns null if not available.
  function attachmentToUrl(a: string | Attachment | undefined): string | null {
    if (!a) return null;
    if (typeof a === "string") return a;
    // object
    if (a.url && typeof a.url === "string") return a.url;
    if (a.path && typeof a.path === "string") {
      // If you ever stored only a storage path like "attachments/xxxx.jpg" we try to build a public URL.
      // This relies on NEXT_PUBLIC_SUPABASE_URL being present client-side.
      try {
        const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? (window as any).__SUPABASE_URL) || "";
        if (!base) return a.path;
        const cleanBase = base.replace(/\/$/, "");
        const cleanPath = a.path.startsWith("/") ? a.path.slice(1) : a.path;
        return `${cleanBase}/storage/v1/object/public/${cleanPath}`;
      } catch {
        return a.path;
      }
    }
    return null;
  }

  // Build normalized attachments array of { url, filename, id } for rendering
  const normalizedAttachments: { url: string; filename?: string | null; id?: string }[] = Array.isArray(post.attachments)
    ? post.attachments
        .map((a) => {
          const url = attachmentToUrl(a as any);
          if (!url) return null;
          const filename = typeof a === "string" ? undefined : (a as Attachment).filename;
          const id = typeof a === "string" ? undefined : (a as Attachment).id;
          return { url, filename, id };
        })
        .filter(Boolean) as { url: string; filename?: string | null; id?: string }[]
    : [];

  return (
    <article className="mx-auto my-6 w-140 rounded-3xl bg-[#0e0e10] border border-gray-800 p-6 shadow-lg">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-base text-gray-200 overflow-hidden shrink-0">
          {post.author?.avatarUrl ? (
            <img src={post.author.avatarUrl} alt={authorName} className="w-full h-full object-cover block" />
          ) : (
            <span className="font-semibold">{(authorName || "U").slice(0, 1).toUpperCase()}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3">
            <span className="font-semibold text-gray-100 text-base">{authorName}</span>
            {authorHandle && <span className="text-xs text-gray-400">{authorHandle}</span>}
            {post.created_at && <span className="text-xs text-gray-500">· {new Date(post.created_at).toLocaleString()}</span>}
          </div>

          <div className="mt-4 text-base text-gray-200 whitespace-pre-wrap break-words">{post.content}</div>

          {normalizedAttachments.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-3">
              {normalizedAttachments.map((att, i) => (
                <div key={att.id ?? att.url ?? i} className="rounded-xl overflow-hidden border border-gray-800 bg-black/30">
                  <img
                    src={att.url}
                    alt={att.filename ?? `attachment-${i}`}
                    className="w-full max-h-[520px] object-cover block"
                    loading="lazy"
                    onError={(e) => {
                      // hide broken images gracefully
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 flex items-center justify-between text-gray-300">
            <div className="flex gap-3">
              <button
                onClick={handleLike}
                disabled={busyLike}
                className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white/5 transition"
              >
                <Heart size={20} className={liked ? "text-red-400" : "text-gray-300"} />
                <span>{likesCount}</span>
              </button>

              <button
                onClick={handleBookmarkClick}
                disabled={busySave}
                className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white/5 transition disabled:opacity-60"
                aria-pressed={bookmarked}
                aria-label={bookmarked ? "Unsave post" : "Save post"}
              >
                <Bookmark size={20} className={bookmarked ? "text-sky-400" : "text-gray-300"} />
                <span>{bookmarked ? "Saved" : "Save"}</span>
              </button>
            </div>

            <div className="flex gap-3 items-center">
              <button
                onClick={handleSupport}
                disabled={busySupport}
                className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white/3 transition"
              >
                <Send size={18} />
                <span className="text-sm hidden sm:inline">{supportsCount ?? 0} support</span>
              </button>

              <button
                onClick={() => onOpenComments?.(post.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white/5 transition"
              >
                <ImageIcon size={18} />
                <span>{post.commentsCount ?? 0} comments</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
