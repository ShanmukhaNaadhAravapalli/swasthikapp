// src/components/ui/ComposeModalDark.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { Paperclip, Send, RefreshCw } from "lucide-react";

/**
 * ComposeModalDark - updated to create post first, then upload files
 *
 * Props:
 * - open: show/hide
 * - onClose: close handler
 * - onCreated: called with created post object returned by /api/posts/create
 * - initialText?: initial text for textarea
 */

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (post: any) => void;
  initialText?: string;
};

type FileProgress = "queued" | "uploading" | "done" | "error";

export default function ComposeModalDark({ open, onClose, onCreated, initialText = "" }: Props) {
  const [text, setText] = useState(initialText);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [remixing, setRemixing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileProgress, setFileProgress] = useState<Record<string, FileProgress>>({});
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) {
      setText(initialText);
      setFiles([]);
      setError(null);
      setFileProgress({});
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open, initialText]);

  if (!open) return null;

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files ? Array.from(e.target.files) : [];
    if (!f.length) return;
    // limit to 4 files max
    const combined = [...files, ...f].slice(0, 4);
    setFiles(combined);
    const prog: Record<string, FileProgress> = {};
    combined.forEach((file) => {
      prog[file.name] = fileProgress[file.name] ?? "queued";
    });
    setFileProgress(prog);
    e.currentTarget.value = "";
  }

  function removeFile(i: number) {
    const removed = files[i];
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setFileProgress((prev) => {
      const c = { ...prev };
      if (removed) delete c[removed.name];
      return c;
    });
  }

  async function doRemix() {
    if (!text.trim()) return;
    try {
      inputRef.current?.focus();
      if (typeof inputRef.current?.select === "function") inputRef.current.select();
    } catch (_) {}
    setRemixing(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("remix non-ok:", txt);
        setError("AI Remix unavailable — please try again later.");
        return;
      }

      const j = await res.json().catch(() => null);
      const enhanced = j?.enhancedText ?? j?.text ?? j?.result ?? null;

      if (enhanced && typeof enhanced === "string") {
        setText(enhanced);
        setTimeout(() => {
          try {
            inputRef.current?.focus();
            inputRef.current?.select();
          } catch (e) {}
        }, 50);
      } else {
        setError("AI Remix returned no enhanced text.");
      }
    } catch (err: any) {
      console.error("remix error", err);
      setError("AI Remix request failed.");
    } finally {
      setRemixing(false);
    }
  }

  // Upload files & record them in Neon via the combined server route.
  // Expects postId and files; returns the attachments array from the server.
  async function uploadAndRecordFiles(postId: string) {
    if (!files.length) return [];

    const fd = new FormData();
    fd.append("postId", postId);
    for (const f of files) {
      fd.append("files", f);
    }

    // Mark all as uploading for UI
    setFileProgress((p) => {
      const c = { ...p };
      files.forEach((f) => (c[f.name] = "uploading"));
      return c;
    });

    const res = await fetch("/api/attachments/upload-and-record", {
      method: "POST",
      body: fd,
    });

    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const txt = await res.text().catch(() => "");
      // mark errors
      setFileProgress((p) => {
        const c = { ...p };
        files.forEach((f) => (c[f.name] = "error"));
        return c;
      });
      throw new Error("Upload failed: " + (txt || "<no body>"));
    }

    const j = await res.json();
    if (!res.ok) {
      // mark errors
      setFileProgress((p) => {
        const c = { ...p };
        files.forEach((f) => (c[f.name] = "error"));
        return c;
      });
      throw new Error(j?.error || "Upload failed");
    }

    // Mark uploaded files as done (server returns an array of inserted attachment objects)
    if (Array.isArray(j.attachments)) {
      // match by filename where possible
      setFileProgress((p) => {
        const c = { ...p };
        // If server returned filenames, match them; otherwise mark all done.
        if (j.attachments.length > 0 && typeof j.attachments[0].filename === "string") {
          for (const att of j.attachments) {
            const fn = att.filename;
            if (fn && c[fn] !== undefined) c[fn] = "done";
          }
        } else {
          files.forEach((f) => (c[f.name] = "done"));
        }
        return c;
      });
    } else {
      // If attachments missing, mark all as error
      setFileProgress((p) => {
        const c = { ...p };
        files.forEach((f) => (c[f.name] = "error"));
        return c;
      });
      throw new Error("No attachments returned from server");
    }

    return j.attachments;
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);

    if (!text.trim() && files.length === 0) {
      setError("Please write something or attach an image.");
      return;
    }

    setBusy(true);

    try {
      // 1) prepare identity
      const provider = typeof window !== "undefined" ? localStorage.getItem("clientProviderId") : null;
      const userId = typeof window !== "undefined" ? localStorage.getItem("clientUserId") : null;

      // 2) create post first (no attachments sent here because we'll record them server-side with Neon)
      const payload = {
        content: text,
        attachments: [], // keep empty — attachments will be recorded by upload-and-record route
        is_anonymous: true,
        provider_user_id: provider ?? null,
        userId: userId ?? null,
        display_name: "You",
      };

      const createRes = await fetch("/api/posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const createCt = createRes.headers.get("content-type") || "";
      if (!createCt.includes("application/json")) {
        const txt = await createRes.text().catch(() => "");
        throw new Error("Create returned non-json: " + (txt ? txt.slice(0, 2000) : "<no body>"));
      }
      const createJson = await createRes.json();
      if (!createRes.ok) throw new Error(createJson?.error || createJson?.detail || "Create failed");

      const created = createJson?.post ?? createJson;
      const postId = created?.id;
      if (!postId) throw new Error("Server did not return post id");

      // 3) if files exist, upload them and record attachments in Neon with postId
      let recordedAttachments: any[] = [];
      if (files.length > 0) {
        try {
          recordedAttachments = await uploadAndRecordFiles(postId);
        } catch (upErr: any) {
          // If upload+record fails, we still have a post created. Surface error to user.
          console.error("uploadAndRecordFiles error", upErr);
          setError(upErr?.message ?? "Failed to upload attachments");
          // Optionally: you could delete the post if attachments are critical; currently we keep the post.
          // Continue and return with created post (without attachments), or stop flow. We'll stop here.
          setBusy(false);
          return;
        }
      }

      // 4) attach urls to created object for UI
      const attachmentUrls = Array.isArray(recordedAttachments)
        ? recordedAttachments.map((a: any) => a.url ?? a.public_url ?? a.path ?? null).filter(Boolean)
        : [];
      created.attachments = attachmentUrls;

      // 5) success — call parent and close
      onCreated?.(created);
      setText("");
      setFiles([]);
      setFileProgress({});
      onClose();
    } catch (err: any) {
      console.error("compose submit error", err);
      setError(err?.message ?? "Failed to create post");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !busy && onClose()} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-2xl mx-4 md:mx-0 bg-[#0b0b0b] border border-gray-800 rounded-2xl p-4 md:p-6 shadow-2xl text-gray-100 z-50"
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between mb-3">
          <h3 className="text-lg md:text-xl font-semibold">Create Post</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setText("");
                setFiles([]);
                setFileProgress({});
                setError(null);
              }}
              className="text-sm text-gray-400 hover:text-gray-200"
              disabled={busy}
            >
              Clear
            </button>

            <button
              type="button"
              onClick={() => !busy && onClose()}
              className="text-sm text-gray-400 hover:text-gray-200"
              disabled={busy}
            >
              Close
            </button>
          </div>
        </header>

        <div className="mb-3">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your thoughts — you're anonymous here."
            className="w-full min-h-[160px] md:min-h-[220px] p-4 rounded-lg bg-[#0e0e10] border border-gray-800 text-gray-100 resize-y placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            disabled={busy}
          />
        </div>

        {files.length > 0 && (
          <div className="mb-3 grid grid-cols-4 gap-2">
            {files.map((f, i) => (
              <div key={f.name + i} className="relative rounded overflow-hidden border border-gray-700">
                <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-20 object-cover" />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                  aria-label="Remove"
                >
                  ✕
                </button>
                <div className="absolute left-1 bottom-1 text-xs px-1 rounded bg-black/60 text-gray-200">
                  {fileProgress[f.name] ?? "queued"}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-[#0f0f10] border border-gray-800 cursor-pointer text-sm text-gray-200">
              <Paperclip size={16} />
              <input type="file" accept="image/*" multiple className="hidden" onChange={onPickFiles} disabled={busy} />
              <span className="hidden md:inline">Add photos</span>
            </label>

            <button
              type="button"
              onClick={doRemix}
              disabled={remixing || busy}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm shadow-sm"
              title="AI Remix — enhance your text"
            >
              <RefreshCw size={14} />
              <span className="text-sm">{remixing ? "Remixing..." : "AI REMIX"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {error && <div className="text-sm text-red-400 mr-2 break-words max-w-[260px]">{error}</div>}
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
              disabled={busy}
            >
              <Send size={14} />
              <span>{busy ? "Posting..." : "Post"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
