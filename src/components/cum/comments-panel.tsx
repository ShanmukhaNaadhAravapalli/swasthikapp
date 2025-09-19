"use client";
import React, { useEffect, useState } from "react";

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  display_name?: string | null;
  userId?: string | null;
};

export default function CommentsPanel({
  postId,
  onClose,
  onCommentCreated, // optional callback to notify parent (so it can bump commentsCount)
  clientUserId, // optional: pass client user id if available
}: {
  postId: string;
  onClose: () => void;
  onCommentCreated?: (comment: CommentRow, newCount: number) => void;
  clientUserId?: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailMap, setDetailMap] = useState<Record<string, number> | null>(null);

  // load comments
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      setDetailMap(null);
      try {
        const res = await fetch(`/api/posts/comments/${encodeURIComponent(postId)}`);
        const ct = res.headers.get("content-type") || "";
        if (!res.ok) throw new Error(`fetch failed (${res.status})`);
        if (!ct.includes("application/json")) throw new Error("server returned non-json for comments");
        const j = await res.json();
        if (mounted) setComments(Array.isArray(j?.comments) ? j.comments : []);
      } catch (err: any) {
        console.error("comments load error", err);
        if (mounted) setError(String(err?.message ?? err));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [postId]);

  // helper: ensure provider id exists in localStorage (client-side)
  function getProvider() {
    try {
      let p = typeof window !== "undefined" ? localStorage.getItem("clientProviderId") : null;
      if (!p && typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        p = crypto.randomUUID();
        localStorage.setItem("clientProviderId", p);
      }
      return p;
    } catch {
      return null;
    }
  }

  // submit comment — wait for server, do not optimistic-append
  async function submitComment() {
    const content = text.trim();
    if (!content) {
      setError("Please write something before posting.");
      setDetailMap(null);
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    setDetailMap(null);

    try {
      const provider = getProvider();
      const res = await fetch("/api/posts/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          content,
          provider_user_id: provider,
          userId: clientUserId ?? localStorage.getItem("clientUserId") ?? null,
          display_name: "You",
        }),
      });

      const ct = res.headers.get("content-type") || "";

      // non-OK handling: parse JSON error (if present) and show friendly message.
      if (!res.ok) {
        let json: any = null;
        if (ct.includes("application/json")) {
          try {
            json = await res.json();
          } catch {
            // ignore parse error
          }
        }
        // If Perspective returned details, show them in UI
        if (json?.details && typeof json.details === "object") {
          setDetailMap(json.details);
        } else {
          setDetailMap(null);
        }

        const message =
          (json && typeof json.error === "string" && json.error) ||
          (res.status === 503 && "Moderation service unavailable. Try again later.") ||
          (res.status === 500 && "Server error. Try again later.") ||
          `Failed to post comment (${res.status})`;

        setError(message);
        return;
      }

      // OK: expect JSON with { comment: { ... } }
      let j: any = null;
      if (ct.includes("application/json")) {
        j = await res.json().catch(() => null);
      }

      if (!j?.comment) {
        setError("Unexpected server response.");
        return;
      }

      // success — add returned comment and clear input
      setComments((prev) => [...prev, j.comment]);
      setText("");
      setError(null);
      setDetailMap(null);

      // notify parent about new count if provided, otherwise try to fetch count
      if (typeof j.commentsCount === "number") {
        onCommentCreated?.(j.comment, j.commentsCount);
      } else {
        try {
          const countRes = await fetch(`/api/posts/comments/${encodeURIComponent(postId)}`);
          const countJson = await countRes.json();
          const newCount = Array.isArray(countJson?.comments) ? countJson.comments.length : null;
          if (newCount !== null) onCommentCreated?.(j.comment, newCount);
        } catch (e) {
          // ignore count fetch errors
        }
      }
    } catch (err: any) {
      console.error("submit comment failed", err);
      setError(String(err?.message ?? err));
      setDetailMap(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-[#0b0b0b] border border-gray-800 rounded-lg p-4 text-gray-100 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Comments</h3>
        <button onClick={onClose} className="text-sm text-gray-400">
          Close
        </button>
      </div>

      <div className="space-y-3 mb-4 max-h-[50vh] overflow-y-auto">
        {loading ? (
          <div className="text-gray-400">Loading comments…</div>
        ) : comments.length === 0 ? (
          <div className="text-gray-400">No comments yet — be the first.</div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-sm text-gray-200 shrink-0">
                {c.display_name ? c.display_name.slice(0, 1).toUpperCase() : "A"}
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-200">
                  <strong>{c.display_name ?? "Anonymous"}</strong>
                </div>
                <div className="text-sm text-gray-300">{c.content}</div>
                <div className="text-xs text-gray-500 mt-1">{new Date(c.created_at).toLocaleString()}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a supportive comment..."
          className="w-full bg-[#0e0e10] border border-gray-800 rounded p-2 text-sm resize-none"
          rows={3}
          aria-label="Write a comment"
        />
        {/* Error area lives below the textarea so user sees it near the input */}
        {error && (
          <div className="mt-2 text-sm text-red-400">
            {error}
            {detailMap && (
              <div className="mt-2 text-xs text-red-300">
                <div className="font-medium">Moderation details:</div>
                <ul className="list-disc ml-5">
                  {Object.entries(detailMap).map(([k, v]) => (
                    <li key={k}>
                      {k}: {(v as number).toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 mt-2">
          <button
            onClick={() => {
              setText("");
              setError(null);
              setDetailMap(null);
            }}
            className="text-sm text-gray-400"
          >
            Clear
          </button>
          <button
            onClick={submitComment}
            disabled={submitting || text.trim().length === 0}
            className="px-3 py-2 rounded bg-indigo-600 text-white text-sm disabled:opacity-60"
          >
            {submitting ? "Posting…" : "Post comment"}
          </button>
        </div>
      </div>
    </div>
  );
}
